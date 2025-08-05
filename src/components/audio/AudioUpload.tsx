'use client'

import { useState, useRef, useCallback } from 'react'

interface AudioVersion {
  id: string
  trackId: string
  versionType: string
  fileName: string
  filePath: string
  fileSize: number
  createdAt: string
  updatedAt: string
}

interface AudioUploadProps {
  trackId: string
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
  onUploadComplete?: (audioVersion: AudioVersion) => void
  existingFile?: string
}

export default function AudioUpload({ 
  trackId, 
  versionType, 
  onUploadComplete,
  existingFile 
}: AudioUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File) => {
    const maxSize = 500 * 1024 * 1024 // 500MB
    let allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/aiff']
    let allowedExtensions = ['.wav', '.mp3', '.flac', '.aiff']
    if (versionType === 'ATMOS') {
      allowedTypes = ['application/octet-stream', 'audio/wav']
      allowedExtensions = ['.bin', '.wav']
    }
    if (file.size > maxSize) {
      throw new Error('File size must be less than 500MB')
    }
    // Check by MIME type or extension
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      if (versionType === 'ATMOS') {
        throw new Error('Only BIN or WAV files are allowed for Atmos')
      } else {
        throw new Error('Only WAV, MP3, FLAC, and AIFF files are allowed')
      }
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setError('')
      setSuccess('')
      setUploadProgress(0)

      validateFile(file)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('trackId', trackId)
      formData.append('versionType', versionType)

      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })

      // Handle response
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.onload = () => {
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText
          })
          resolve(response)
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        
        xhr.open('POST', '/api/upload/audio')
        xhr.send(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(`${versionType} version uploaded successfully!`)
        setUploadProgress(100)
        onUploadComplete?.(result.audioVersion)
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setError(errorMessage)
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }, [trackId, versionType, uploadFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }


  return (
    <div>

      {existingFile && !uploading && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-300">Current File</div>
              <div className="text-xs text-green-400/80">{existingFile}</div>
            </div>
            <div className="text-green-400 text-sm">✓ Uploaded</div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-red-400 bg-red-900/20'
            : uploading
            ? 'border-red-600/50 bg-red-900/10'
            : 'border-red-900/50 hover:border-red-400 hover:bg-red-900/20 cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={versionType === 'ATMOS' ? '.bin,.wav' : '.wav,.mp3,.flac,.aiff'}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto"></div>
            <div>
              <div className="text-sm font-medium text-white mb-2">
                Uploading...
              </div>
              <div className="w-full bg-red-900/30 rounded-full h-2">
                <div 
                  className="bg-red-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-red-300 mt-1">{uploadProgress}%</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-medium text-white mb-1">
                Drop your audio file here
              </div>
              <div className="text-sm text-gray-300">
                or <span className="text-red-400 font-medium">browse files</span>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {versionType === 'ATMOS' ? 'BIN or WAV (Dolby Atmos ADM BWF) • Max 500MB' : 'WAV, MP3, FLAC, AIFF • Max 500MB'}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
          <div className="text-red-300 text-sm font-medium">Upload Error</div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
          <div className="text-green-300 text-sm font-medium">✓ {success}</div>
        </div>
      )}
    </div>
  )
}