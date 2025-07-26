'use client'

import { useState, useRef, useCallback } from 'react'

interface AudioUploadProps {
  trackId: string
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
  onUploadComplete?: (audioVersion: any) => void
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
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/aiff']
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 500MB')
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only WAV, MP3, FLAC, and AIFF files are allowed')
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

    } catch (error: any) {
      setError(error.message)
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
  }, [trackId, versionType])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getVersionColor = () => {
    switch (versionType) {
      case 'STEREO': return 'bg-green-500'
      case 'ATMOS': return 'bg-blue-500'
      case 'REFERENCE': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getVersionName = () => {
    switch (versionType) {
      case 'STEREO': return 'Stereo Mix'
      case 'ATMOS': return 'Atmos Mix'
      case 'REFERENCE': return 'Reference Mix'
      default: return versionType
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${getVersionColor()}`}></div>
        <h3 className="text-lg font-semibold text-gray-800">{getVersionName()}</h3>
      </div>

      {existingFile && !uploading && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">Current File</div>
              <div className="text-xs text-gray-600">{existingFile}</div>
            </div>
            <div className="text-green-600 text-sm">✓ Uploaded</div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-red-400 bg-red-50'
            : uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-red-400 hover:bg-red-50 cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.flac,.aiff"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <div>
              <div className="text-sm font-medium text-gray-800 mb-2">
                Uploading {versionType.toLowerCase()} mix...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 mt-1">{uploadProgress}%</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <div>
              <div className="text-lg font-medium text-gray-800 mb-1">
                Drop your {versionType.toLowerCase()} mix here
              </div>
              <div className="text-sm text-gray-600">
                or <span className="text-red-600 font-medium">browse files</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              WAV, MP3, FLAC, AIFF • Max 500MB
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-sm font-medium">Upload Error</div>
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600 text-sm font-medium">✓ {success}</div>
        </div>
      )}
    </div>
  )
}