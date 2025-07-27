'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Track {
  id: string
  name: string
  trackNumber?: number
  duration?: number
  bpm?: number
  key?: string
  audioVersions: Array<{
    id: string
    versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
    fileName: string
    isNormalized: boolean
  }>
  _count?: {
    comments: number
  }
}

interface Project {
  id: string
  name: string
  artist: string
  description?: string
  coverImage?: string
  status: string
  createdAt: string
  tracks: Track[]
  user: {
    name: string
    email: string
  }
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateTrack, setShowCreateTrack] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [newTrack, setNewTrack] = useState({
    name: '',
    trackNumber: '',
    bpm: '',
    key: ''
  })

  const [removingTrackId, setRemovingTrackId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else if (response.status === 404) {
        setError('Project not found')
      } else {
        setError('Failed to load project')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')

    try {
      const trackData = {
        name: newTrack.name,
        trackNumber: newTrack.trackNumber ? parseInt(newTrack.trackNumber) : undefined,
        bpm: newTrack.bpm ? parseInt(newTrack.bpm) : undefined,
        key: newTrack.key || undefined,
        projectId: params.id
      }

      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh project data
        fetchProject()
        // Reset form
        setNewTrack({ name: '', trackNumber: '', bpm: '', key: '' })
        setShowCreateTrack(false)
      } else {
        setCreateError(data.error || 'Failed to create track')
      }
    } catch (error) {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleTrackInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTrack(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVersionCounts = (track: Track) => {
    const versions = track.audioVersions.reduce((acc, version) => {
      acc[version.versionType] = true
      return acc
    }, {} as Record<string, boolean>)

    return {
      stereo: versions.STEREO || false,
      atmos: versions.ATMOS || false,
      reference: versions.REFERENCE || false
    }
  }

  const handleRemoveTrack = async (trackId: string) => {
    setRemovingTrackId(trackId)
    setRemoveError(null)
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchProject()
      } else {
        const data = await res.json()
        setRemoveError(data.error || 'Failed to remove track.')
      }
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove track.')
    } finally {
      setRemovingTrackId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span>Loading project...</span>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Project not found'}</div>
          <Link 
            href="/dashboard"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="%23ffffff" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>')`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-sm border-b border-red-900/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-3 text-red-300 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z"/>
                  </svg>
                  <span>Back to Albums</span>
                </Link>
                <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">JWX</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowCreateTrack(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Add Track
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Project Header */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-red-600 to-red-800 px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex space-x-6">
                  {/* Album Cover */}
                  <div className="w-32 h-32 bg-white/20 rounded-xl flex items-center justify-center">
                    {project.coverImage ? (
                      <img 
                        src={project.coverImage} 
                        alt={project.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="text-center">
                        <svg className="w-12 h-12 text-white/60 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                        <span className="text-white/60 text-xs">No Cover</span>
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
                    <p className="text-red-100 text-xl mb-1">{project.artist}</p>
                    {project.description && (
                      <p className="text-red-200 mb-4">{project.description}</p>
                    )}
                    <div className="flex items-center space-x-6 text-red-200 text-sm">
                      <span>{project.tracks.length} track{project.tracks.length !== 1 ? 's' : ''}</span>
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded ${
                        project.status === 'ACTIVE' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-500 text-white'
                      }`}>
                        {project.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Track Modal */}
          {showCreateTrack && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Add New Track</h3>
                    <button
                      onClick={() => setShowCreateTrack(false)}
                      className="text-white hover:text-red-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCreateTrack} className="p-6 space-y-4">
                  {createError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-600 text-sm">{createError}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="trackName" className="block text-sm font-medium text-gray-700 mb-1">
                      Track Name *
                    </label>
                    <input
                      type="text"
                      id="trackName"
                      name="name"
                      value={newTrack.name}
                      onChange={handleTrackInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="Enter track name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="trackNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Track Number
                      </label>
                      <input
                        type="number"
                        id="trackNumber"
                        name="trackNumber"
                        value={newTrack.trackNumber}
                        onChange={handleTrackInputChange}
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <label htmlFor="bpm" className="block text-sm font-medium text-gray-700 mb-1">
                        BPM
                      </label>
                      <input
                        type="number"
                        id="bpm"
                        name="bpm"
                        value={newTrack.bpm}
                        onChange={handleTrackInputChange}
                        min="1"
                        max="300"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                        placeholder="120"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
                      Key
                    </label>
                    <input
                      type="text"
                      id="key"
                      name="key"
                      value={newTrack.key}
                      onChange={handleTrackInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="C Major"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateTrack(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newTrack.name.trim()}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                    >
                      {creating ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </div>
                      ) : (
                        'Add Track'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tracks List */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Tracks</h2>
            </div>

            {project.tracks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No tracks yet</h3>
                <p className="text-gray-600 mb-6">Add your first track to start collaborating</p>
                <button 
                  onClick={() => setShowCreateTrack(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Add First Track
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {project.tracks.map((track, index) => {
                  const versions = getVersionCounts(track)
                  return (
                    <div key={track.id} className="flex items-center justify-between px-8 py-6 hover:bg-gray-50 transition-colors group">
                      <Link
                        href={`/track/${track.id}`}
                        className="flex items-center space-x-4 flex-1"
                      >
                        {/* Track Number */}
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <span className="text-red-600 font-medium text-sm">
                            {track.trackNumber || index + 1}
                          </span>
                        </div>

                        {/* Track Info */}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors">
                            {track.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{formatDuration(track.duration)}</span>
                            {track.bpm && <span>{track.bpm} BPM</span>}
                            {track.key && <span>Key: {track.key}</span>}
                            {track._count?.comments && (
                              <span>{track._count.comments} comment{track._count.comments !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Available Versions & Remove Button */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${versions.stereo ? 'bg-green-500' : 'bg-gray-300'}`} title="Stereo"></div>
                          <div className={`w-3 h-3 rounded-full ${versions.atmos ? 'bg-blue-500' : 'bg-gray-300'}`} title="Atmos"></div>
                          <div className={`w-3 h-3 rounded-full ${versions.reference ? 'bg-purple-500' : 'bg-gray-300'}`} title="Reference"></div>
                        </div>
                        {track.audioVersions.length === 0 && (
                          <Link
                            href={`/track/${track.id}/upload`}
                            className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Upload Audio
                          </Link>
                        )}
                        <button
                          onClick={() => handleRemoveTrack(track.id)}
                          disabled={removingTrackId === track.id}
                          className="ml-2 p-2 rounded-full hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors disabled:opacity-60"
                          title="Remove Track"
                        >
                          {removingTrackId === track.id ? (
                            <span className="animate-spin w-4 h-4 inline-block border-b-2 border-red-600 rounded-full"></span>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"/><path fillRule="evenodd" d="M4 6a1 1 0 011-1h10a1 1 0 011 1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm2 0v10h8V6H6zM9 2a1 1 0 00-1 1v1H6a1 1 0 000 2h8a1 1 0 100-2h-2V3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
                {removeError && <div className="text-red-600 text-sm px-8 py-2">{removeError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}