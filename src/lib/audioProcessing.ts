import { spawn } from 'child_process'
import { promises as fs } from 'fs'

export interface AudioAnalysis {
  duration: number
  sampleRate: number
  bitDepth: number
  channels: number
  codec: string
  originalLufs: number
  peakLevel: number
  truePeak: number
  dynamicRange: number
}

export interface NormalizationSettings {
  targetLufs: number
  maxTruePeak: number
  preserveDynamics: boolean
}

export interface ProcessingResult {
  success: boolean
  analysis: AudioAnalysis
  normalizedPath: string
  settings: NormalizationSettings
  error?: string
}

// Apple Music SoundCheck Standards
export const NORMALIZATION_TARGETS = {
  STEREO_MASTER: {
    targetLufs: -16.0,
    maxTruePeak: -1.0,
    preserveDynamics: true
  },
  ATMOS: {
    targetLufs: -18.0,  // Atmos has different standard
    maxTruePeak: -1.0,
    preserveDynamics: true
  },
  BINAURAL: {
    targetLufs: -16.0,
    maxTruePeak: -1.0,
    preserveDynamics: true
  },
  REFERENCE: {
    targetLufs: 0, // No normalization for reference tracks
    maxTruePeak: 0,
    preserveDynamics: false
  }
}

/**
 * Analyze audio file to get technical specifications and loudness measurements
 */
export async function analyzeAudioFile(filePath: string): Promise<AudioAnalysis> {
  return new Promise((resolve, reject) => {
    // Use ffprobe for technical analysis
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ])

    let stdout = ''
    let stderr = ''

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffprobe.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`))
        return
      }

      try {
        const probeData = JSON.parse(stdout)
        const audioStream = probeData.streams.find((s: { codec_type: string }) => s.codec_type === 'audio')
        
        if (!audioStream) {
          reject(new Error('No audio stream found'))
          return
        }

        // Now analyze loudness with ffmpeg
        const loudnessAnalysis = await analyzeLoudness(filePath)

        resolve({
          duration: parseFloat(probeData.format.duration),
          sampleRate: parseInt(audioStream.sample_rate),
          bitDepth: audioStream.bits_per_sample || (audioStream.sample_fmt?.includes('16') ? 16 : 24),
          channels: audioStream.channels,
          codec: audioStream.codec_name,
          ...loudnessAnalysis
        })
      } catch (error) {
        reject(new Error(`Failed to parse ffprobe output: ${error}`))
      }
    })
  })
}

/**
 * Analyze loudness using ffmpeg's ebur128 filter
 */
async function analyzeLoudness(filePath: string): Promise<{
  originalLufs: number
  peakLevel: number
  truePeak: number
  dynamicRange: number
}> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', filePath,
      '-af', 'ebur128=peak=true',
      '-f', 'null',
      '-'
    ])

    let stderr = ''

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', () => {
      try {
        // Parse EBU R128 measurements from stderr
        const lines = stderr.split('\n')
        
        let integratedLoudness = 0
        let truePeak = 0
        let loudnessRange = 0
        let maxMomentary = 0

        for (const line of lines) {
          if (line.includes('Integrated loudness:')) {
            const match = line.match(/(-?\d+\.?\d*) LUFS/)
            if (match) integratedLoudness = parseFloat(match[1])
          }
          if (line.includes('True peak:')) {
            const match = line.match(/(-?\d+\.?\d*) dBTP/)
            if (match) truePeak = parseFloat(match[1])
          }
          if (line.includes('Loudness range:')) {
            const match = line.match(/(\d+\.?\d*) LU/)
            if (match) loudnessRange = parseFloat(match[1])
          }
          if (line.includes('Momentary max:')) {
            const match = line.match(/(-?\d+\.?\d*) LUFS/)
            if (match) maxMomentary = parseFloat(match[1])
          }
        }

        resolve({
          originalLufs: integratedLoudness,
          peakLevel: maxMomentary,
          truePeak: truePeak,
          dynamicRange: loudnessRange
        })
      } catch (error) {
        reject(new Error(`Failed to parse loudness analysis: ${error}`))
      }
    })
  })
}

/**
 * Normalize audio file to Apple Music SoundCheck standards
 */
export async function normalizeAudioFile(
  inputPath: string,
  outputPath: string,
  versionType: keyof typeof NORMALIZATION_TARGETS
): Promise<ProcessingResult> {
  try {
    // First analyze the original file
    const analysis = await analyzeAudioFile(inputPath)
    const settings = NORMALIZATION_TARGETS[versionType]

    // Skip normalization for reference tracks
    if (versionType === 'REFERENCE') {
      // Just copy the file
      await fs.copyFile(inputPath, outputPath)
      
      return {
        success: true,
        analysis,
        normalizedPath: outputPath,
        settings
      }
    }

    // Build ffmpeg command for normalization
    const ffmpegArgs = [
      '-i', inputPath,
      '-af', `loudnorm=I=${settings.targetLufs}:TP=${settings.maxTruePeak}:LRA=11:print_format=json`,
      '-ar', '48000', // Ensure 48kHz for streaming
      '-c:a', 'pcm_s24le', // 24-bit PCM for quality
      outputPath
    ]

    await runFFmpeg(ffmpegArgs)

    // Verify the normalized file
    const normalizedAnalysis = await analyzeAudioFile(outputPath)

    return {
      success: true,
      analysis: {
        ...analysis,
        // Update with post-normalization values
        originalLufs: normalizedAnalysis.originalLufs,
        peakLevel: normalizedAnalysis.peakLevel,
        truePeak: normalizedAnalysis.truePeak
      },
      normalizedPath: outputPath,
      settings
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed'
    return {
      success: false,
      analysis: {} as AudioAnalysis,
      normalizedPath: '',
      settings: NORMALIZATION_TARGETS[versionType],
      error: errorMessage
    }
  }
}

/**
 * Generate waveform data for visualization
 */
export async function generateWaveformData(filePath: string, width: number = 1000): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', filePath,
      '-ac', '1', // Mono
      '-ar', '8000', // Low sample rate for visualization
      '-f', 'f32le', // 32-bit float output
      '-'
    ])

    const chunks: Buffer[] = []

    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk)
    })

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to generate waveform data'))
        return
      }

      try {
        const buffer = Buffer.concat(chunks)
        const samples: number[] = []
        
        // Read 32-bit float samples
        for (let i = 0; i < buffer.length; i += 4) {
          if (i + 4 <= buffer.length) {
            samples.push(buffer.readFloatLE(i))
          }
        }

        // Downsample to desired width
        const samplesPerPixel = Math.floor(samples.length / width)
        const waveformData: number[] = []

        for (let i = 0; i < width; i++) {
          const start = i * samplesPerPixel
          const end = start + samplesPerPixel
          const slice = samples.slice(start, end)
          
          // Calculate RMS for this slice
          const rms = Math.sqrt(slice.reduce((sum, sample) => sum + sample * sample, 0) / slice.length)
          waveformData.push(rms)
        }

        resolve(waveformData)
      } catch (error) {
        reject(new Error(`Failed to process waveform data: ${error}`))
      }
    })
  })
}

/**
 * Run ffmpeg command and return promise
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args)
    let stderr = ''

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg failed: ${stderr}`))
      }
    })
  })
}

/**
 * Get target LUFS for a version type
 */
export function getTargetLufs(versionType: string): number {
  const targets = NORMALIZATION_TARGETS as Record<string, { targetLufs: number }>
  return targets[versionType]?.targetLufs || -16.0
}

/**
 * Format LUFS value for display
 */
export function formatLufs(lufs: number): string {
  if (lufs === 0) return 'N/A'
  return `${lufs.toFixed(1)} LUFS`
}

/**
 * Format dynamic range for display
 */
export function formatDynamicRange(lu: number): string {
  return `${lu.toFixed(1)} LU`
}

/**
 * Get version type display name
 */
export function getVersionTypeName(type: string): string {
  const names: Record<string, string> = {
    'STEREO_MASTER': 'Stereo Master',
    'ATMOS': 'Atmos Mix',
    'BINAURAL': 'Binaural Mix',
    'REFERENCE': 'Reference Track'
  }
  return names[type] || type
}

/**
 * Get version type color for UI
 */
export function getVersionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'STEREO_MASTER': 'bg-green-500',
    'ATMOS': 'bg-blue-500',
    'BINAURAL': 'bg-purple-500',
    'REFERENCE': 'bg-gray-500'
  }
  return colors[type] || 'bg-gray-500'
}