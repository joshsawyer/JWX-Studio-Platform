'use client'

import { useState, useEffect } from 'react'

interface AudioVersion {
  id: string
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
  versionNumber: number
  fileName: string
  filePath: string
  isActive: boolean
  fileSize: number
  lufsLevel?: number
  createdAt: string
}

interface VersionManagerProps {
  trackId: string
  onVersionChange?: () => void
}

const VersionManager = ({ trackId, onVersionChange }: VersionManagerProps) => {
  const [versions, setVersions] = useState<AudioVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tracks/${trackId}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data)
      } else {
        setError('Failed to fetch versions')
      }
    } catch {
      setError('Error loading versions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVersions()
  }, [trackId])

  const setActiveVersion = async (versionId: string, versionType: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/versions/${versionId}/activate`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setVersions(versions.map(v => ({
          ...v,
          isActive: v.versionType === versionType ? v.id === versionId : (v.versionType === versionType ? false : v.isActive)
        })))
        // Notify parent component that version changed
        onVersionChange?.()
      }
    } catch (err) {
      console.error('Error setting active version:', err)
    }
  }

  const deleteVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version?')) return

    try {
      const response = await fetch(`/api/tracks/${trackId}/versions/${versionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setVersions(versions.filter(v => v.id !== versionId))
      }
    } catch (err) {
      console.error('Error deleting version:', err)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getVersionTypeColor = (type: string) => {
    switch (type) {
      case 'STEREO': return 'bg-green-100 text-green-800 border-green-200'
      case 'ATMOS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'REFERENCE': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const groupedVersions = versions.reduce((acc, version) => {
    if (!acc[version.versionType]) {
      acc[version.versionType] = []
    }
    acc[version.versionType].push(version)
    return acc
  }, {} as Record<string, AudioVersion[]>)

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl border border-red-200">
        <div className="text-red-600 text-center">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Version Management</h3>
        <div className="text-sm text-gray-500">
          {versions.length} version{versions.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {Object.entries(groupedVersions).map(([type, typeVersions]) => (
        <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getVersionTypeColor(type)}`}>
                  {type}
                </span>
                <span className="text-sm text-gray-600">
                  {typeVersions.length} version{typeVersions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {typeVersions
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((version) => (
                <div
                  key={version.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">
                          Version {version.versionNumber}
                        </span>
                        {version.isActive && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{version.fileName}</span>
                        <span>{formatFileSize(version.fileSize)}</span>
                        {version.lufsLevel && (
                          <span>{version.lufsLevel.toFixed(1)} LUFS</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!version.isActive && (
                        <button
                          onClick={() => setActiveVersion(version.id, version.versionType)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      
                      {typeVersions.length > 1 && (
                        <button
                          onClick={() => deleteVersion(version.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete version"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {versions.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-gray-600">
            No versions available. Upload some audio files to get started.
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionManager