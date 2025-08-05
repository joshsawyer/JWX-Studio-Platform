import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'
import { normalizeAudioFile } from '@/lib/audioProcessing'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/aiff', 'application/octet-stream']

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const trackId = formData.get('trackId') as string
    const versionType = formData.get('versionType') as string

    // Validate inputs
    if (!file || !trackId || !versionType) {
      return NextResponse.json(
        { error: 'File, trackId, and versionType are required' },
        { status: 400 }
      )
    }

    // Validate file type and extension
    const allowedExtensions = ['.wav', '.mp3', '.flac', '.aiff']
    if (versionType === 'ATMOS') allowedExtensions.push('.bin', '.wav')
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: versionType === 'ATMOS' ? 'Invalid file type. Only BIN or WAV files are allowed for Atmos.' : 'Invalid file type. Allowed: WAV, MP3, FLAC, AIFF' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 500MB' },
        { status: 400 }
      )
    }

    // Validate version type
    if (!['STEREO', 'ATMOS', 'REFERENCE'].includes(versionType)) {
      return NextResponse.json(
        { error: 'Invalid version type' },
        { status: 400 }
      )
    }

    // Verify track exists and user has access
    const track = await prisma.track.findFirst({
      where: { 
        id: trackId,
        ...(user.role === 'CLIENT' ? { 
          project: { userId: user.id } 
        } : {})
      },
      include: {
        project: {
          select: { id: true, userId: true, artist: true }
        }
      }
    })

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found or access denied' },
        { status: 404 }
      )
    }

    // Create directory structure using artist name
    const projectId = track.project.id
    const artistSlug = track.project.artist.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    const uploadDir = path.join(process.cwd(), 'uploads', 'projects', projectId, artistSlug, trackId)
    
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch (error) {
      console.error('Error creating directory:', error)
    }

    // Generate filename preserving original name
    const originalName = path.parse(file.name).name
    let fileExtension = path.extname(file.name) || '.wav'
    
    // For ATMOS, always save as .wav
    if (versionType === 'ATMOS') {
      fileExtension = '.wav'
    }
    
    let fileName = `${originalName}_${versionType.toLowerCase()}${fileExtension}`
    const filePath = path.join(uploadDir, fileName)

    // Save uploaded file to a temp location first
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempPath = path.join(uploadDir, `temp_${Date.now()}${fileExtension}`)
    await fs.writeFile(tempPath, buffer)

    // Map versionType to normalization target key
    let normalizationKey: 'STEREO_MASTER' | 'ATMOS' | 'REFERENCE'
    switch (versionType.toUpperCase()) {
      case 'STEREO':
        normalizationKey = 'STEREO_MASTER'
        break
      case 'ATMOS':
        normalizationKey = 'ATMOS'
        break
      case 'REFERENCE':
        normalizationKey = 'REFERENCE'
        break
      default:
        normalizationKey = 'STEREO_MASTER'
    }

    let normResult = null
    if (versionType === 'ATMOS') {
      // For ATMOS, just move the .bin file to .wav, no normalization
      await fs.rename(tempPath, filePath)
      normResult = { success: true, analysis: {}, normalizedPath: filePath, settings: {} }
    } else {
      // For other types, normalize the audio
      normResult = await normalizeAudioFile(tempPath, filePath, normalizationKey)
      // Remove temp file
      await fs.unlink(tempPath)
      if (!normResult.success) {
        return NextResponse.json({ error: 'Audio normalization failed', details: normResult.error }, { status: 500 })
      }
    }

    // Get the next version number for this type
    const latestVersion = await prisma.audioVersion.findFirst({
      where: {
        trackId,
        versionType: versionType as 'STEREO' | 'ATMOS' | 'REFERENCE'
      },
      orderBy: {
        versionNumber: 'desc'
      }
    })

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1

    // Deactivate all existing versions of this type
    await prisma.audioVersion.updateMany({
      where: {
        trackId,
        versionType: versionType as 'STEREO' | 'ATMOS' | 'REFERENCE'
      },
      data: {
        isActive: false
      }
    })

    // Update filename to include version number
    const versionSuffix = nextVersionNumber > 1 ? `_v${nextVersionNumber}` : ''
    fileName = `${originalName}_${versionType.toLowerCase()}${versionSuffix}${fileExtension}`
    const versionedFilePath = path.join(uploadDir, fileName)
    const versionedRelativePath = `/uploads/projects/${projectId}/${artistSlug}/${trackId}/${fileName}`

    // Move file to versioned name
    await fs.rename(filePath, versionedFilePath)

    // Create new version
    const audioVersion = await prisma.audioVersion.create({
      data: {
        trackId,
        versionType: versionType as 'STEREO' | 'ATMOS' | 'REFERENCE',
        versionNumber: nextVersionNumber,
        fileName,
        filePath: versionedRelativePath,
        fileSize: buffer.length,
        isNormalized: versionType === 'ATMOS' ? false : true,
        lufsLevel: versionType === 'ATMOS' ? null : normResult.analysis.originalLufs ?? null,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      audioVersion,
      message: `${versionType} version uploaded successfully`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}