'use client'

import { useEffect, useRef, useState } from 'react'

interface WaveformPlayerProps {
  audioUrl: string
  trackName: string
  artistName: string
  albumName: string
  height?: number
  currentMix?: 'stereo' | 'atmos' | 'reference'
  availableMixes?: ('STEREO' | 'ATMOS' | 'REFERENCE')[]
  onMixChange?: (mix: 'stereo' | 'atmos' | 'reference') => void
  trackId?: string
  projectId?: string
  onReady?: () => void
  onTimeUpdate?: (currentTime: number) => void
}

interface Comment {
  id: string
  timestampMs: number
  content: string
  user: string
  status: 'pending' | 'approved' | 'resolved'
  replies?: CommentReply[]
}

interface CommentReply {
  id: string
  content: string
  user: string
  createdAt: string
}

const WaveformPlayer = ({ 
  audioUrl, 
  trackName, 
  artistName, 
  albumName,
  height = 150,
  currentMix: propCurrentMix = 'stereo',
  availableMixes = ['STEREO'],
  onMixChange,
  trackId,
  projectId,
  onReady, 
  onTimeUpdate 
}: WaveformPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<any>(null)
  
  // Audio state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  // Mix state
  const [currentMix, setCurrentMix] = useState<'stereo' | 'atmos' | 'reference'>(propCurrentMix)

  const handleMixChange = (mix: 'stereo' | 'atmos' | 'reference') => {
    setCurrentMix(mix)
    onMixChange?.(mix)
  }

  // Comment state
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      timestampMs: 15000,
      content: 'Guitar needs more presence in the mix',
      user: 'Producer',
      status: 'pending',
      replies: []
    },
    {
      id: '2', 
      timestampMs: 45000,
      content: 'Perfect vocal delivery here',
      user: 'Client',
      status: 'approved',
      replies: [
        { id: 'r1', content: 'Agreed! This is the take', user: 'Engineer', createdAt: '2024-01-15' }
      ]
    },
    {
      id: '3',
      timestampMs: 78000,
      content: 'Add reverb to drums',
      user: 'Artist',
      status: 'resolved',
      replies: []
    },
    {
      id: '4',
      timestampMs: 92000,
      content: 'Bass line is perfect',
      user: 'Producer',
      status: 'approved',
      replies: []
    }
  ])

  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [newReply, setNewReply] = useState('')

  // Convert database file path to API serving URL
  const getSecureAudioUrl = (filePath: string) => {
    if (!filePath) return audioUrl
    
    // Convert "/uploads/projects/..." to "/api/audio/projects/..."
    if (filePath.startsWith('/uploads/')) {
      return filePath.replace('/uploads/', '/api/audio/')
    }
    
    // If it's already a full URL or public path, use as-is
    return filePath
  }

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      setError('No audio URL provided')
      setIsLoading(false)
      return
    }

    const loadWaveSurfer = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const WaveSurfer = (await import('wavesurfer.js')).default
        
        const wavesurfer = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#FCA5A5',
          progressColor: '#DC2626',
          cursorColor: '#991B1B',
          barWidth: 3,
          barRadius: 2,
          responsive: true,
          height: height,
          normalize: true,
          interact: true,
          backend: 'WebAudio'
        })

        wavesurferRef.current = wavesurfer

        // Event listeners
        wavesurfer.on('ready', () => {
          setIsLoading(false)
          setDuration(wavesurfer.getDuration())
          onReady?.()
        })

        wavesurfer.on('play', () => setIsPlaying(true))
        wavesurfer.on('pause', () => setIsPlaying(false))
        
        wavesurfer.on('timeupdate', (time: number) => {
          setCurrentTime(time)
          onTimeUpdate?.(time)
        })

        wavesurfer.on('click', (relativeX: number) => {
          const clickTime = relativeX * duration
          setCommentTimestamp(clickTime * 1000)
        })

        wavesurfer.on('error', (err) => {
          setError(`Failed to load audio: ${err.message || err}`)
          setIsLoading(false)
        })

        await wavesurfer.load(getSecureAudioUrl(audioUrl))
        
      } catch (err: any) {
        setError(`Error: ${err.message}`)
        setIsLoading(false)
      }
    }

    loadWaveSurfer()

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
      }
    }
  }, [audioUrl, height, onReady])

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVolume)
    }
  }

  const seekToTime = (timeMs: number) => {
    if (wavesurferRef.current && duration > 0) {
      const percentage = (timeMs / 1000) / duration
      wavesurferRef.current.seekTo(Math.max(0, Math.min(1, percentage)))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const addComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      timestampMs: commentTimestamp,
      content: newComment.trim(),
      user: 'Current User',
      status: 'pending',
      replies: []
    }

    setComments([...comments, comment])
    setNewComment('')
    setIsAddingComment(false)
  }

  const addReply = (commentId: string) => {
    if (!newReply.trim()) return

    const reply: CommentReply = {
      id: Date.now().toString(),
      content: newReply.trim(),
      user: 'Current User',
      createdAt: new Date().toISOString().split('T')[0]
    }

    setComments(comments.map(comment => 
      comment.id === commentId 
        ? { ...comment, replies: [...(comment.replies || []), reply] }
        : comment
    ))
    
    setNewReply('')
    setReplyingTo(null)
  }

  const updateCommentStatus = (commentId: string, status: Comment['status']) => {
    setComments(comments.map(comment => 
      comment.id === commentId ? { ...comment, status } : comment
    ))
  }

  const getStatusColor = (status: Comment['status']) => {
    switch (status) {
      case 'approved': return 'text-green-700 bg-green-100'
      case 'resolved': return 'text-blue-700 bg-blue-100'
      default: return 'text-amber-700 bg-amber-100'
    }
  }

  const getCommentDotColor = (status: Comment['status']) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'resolved': return 'bg-blue-500'
      default: return 'bg-amber-500'
    }
  }

  const renderCommentDots = () => {
    if (!duration || duration <= 0) return null

    return comments.map((comment) => {
      const position = (comment.timestampMs / 1000) / duration * 100
      return (
        <div
          key={comment.id}
          className={`absolute top-0 w-3 h-3 -mt-1 rounded-full cursor-pointer transform -translate-x-1/2 border-2 border-white shadow-lg hover:scale-125 transition-transform ${getCommentDotColor(comment.status)}`}
          style={{ left: `${position}%` }}
          onClick={() => seekToTime(comment.timestampMs)}
          title={`${formatTime(comment.timestampMs / 1000)} - ${comment.content}`}
        />
      )
    })
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="%23ffffff" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>')`,
          backgroundSize: '50px 50px'
        }}
      />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="bg-black/80 backdrop-blur-sm border-b border-red-900/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">JWX</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">JWX Studio</h1>
                    <p className="text-red-300 text-sm">Professional Audio Collaboration</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {projectId && (
                  <a
                    href={`/project/${projectId}`}
                    className="px-4 py-2 bg-red-700/50 hover:bg-red-700/70 text-red-100 rounded-lg transition-colors font-medium"
                  >
                    Back to Album
                  </a>
                )}
                {trackId && (
                  <a
                    href={`/track/${trackId}/upload`}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Upload Audio
                  </a>
                )}
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Dashboard
                </a>
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">U</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Player Interface */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Track Info Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-800 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-1">{trackName}</h2>
                  <p className="text-red-100 text-lg">{artistName}</p>
                  <p className="text-red-200 text-sm">{albumName}</p>
                </div>
                
                {/* Mix Toggle */}
                <div className="flex items-center space-x-2">
                  <span className="text-red-100 text-sm font-medium">Mix Version:</span>
                  {(['stereo', 'atmos', 'reference'] as const).map((mix) => {
                    const isAvailable = availableMixes.includes(mix.toUpperCase() as 'STEREO' | 'ATMOS' | 'REFERENCE')
                    return (
                      <button
                        key={mix}
                        onClick={() => isAvailable && handleMixChange(mix)}
                        disabled={!isAvailable}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentMix === mix && isAvailable
                            ? 'bg-white text-red-600 shadow-lg'
                            : isAvailable
                            ? 'bg-red-700/50 text-red-100 hover:bg-red-700/70'
                            : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {mix.charAt(0).toUpperCase() + mix.slice(1)}
                        {!isAvailable && ' (N/A)'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Waveform Section */}
            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {comments.length} comment{comments.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {isLoading && (
                  <div className="bg-gray-100 h-40 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-gray-500 flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                      <span className="font-medium">Loading waveform...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 h-40 rounded-xl flex items-center justify-center">
                    <div className="text-red-600 text-center px-4">
                      <div className="font-semibold mb-2">Error Loading Audio</div>
                      <div className="text-sm">{error}</div>
                    </div>
                  </div>
                )}

                {/* Waveform with Comment Dots */}
                <div className="relative">
                  <div 
                    ref={containerRef} 
                    className={`rounded-xl overflow-hidden cursor-pointer border-2 border-gray-200 ${(isLoading || error) ? 'hidden' : ''}`}
                    style={{ 
                      background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  
                  {/* Comment Dots Overlay */}
                  <div className="absolute top-0 left-0 right-0 h-full pointer-events-none">
                    {renderCommentDots()}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={togglePlayPause}
                    disabled={isLoading || !!error}
                    className="flex items-center justify-center w-14 h-14 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isPlaying ? (
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>

                  <div className="flex items-center space-x-4">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-32 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer volume-slider"
                    />
                    <span className="text-sm text-gray-600 w-8">{Math.round(volume * 100)}%</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsAddingComment(true)
                    setCommentTimestamp(currentTime * 1000)
                  }}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                  <span>Add Comment</span>
                </button>
              </div>

              {/* Add Comment Form */}
              {isAddingComment && (
                <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600 font-medium">
                      Adding comment at {formatTime(commentTimestamp / 1000)}
                    </div>
                    <button
                      onClick={() => setIsAddingComment(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Enter your feedback..."
                    className="w-full p-4 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center justify-end space-x-3 mt-4">
                    <button
                      onClick={() => setIsAddingComment(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-bold text-gray-800">
                    Feedback & Comments
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-gray-600">Pending</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Approved</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Resolved</span>
                    </div>
                  </div>
                </div>

                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <button
                            onClick={() => seekToTime(comment.timestampMs)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-mono text-sm transition-colors"
                          >
                            {formatTime(comment.timestampMs / 1000)}
                          </button>
                          <span className="text-gray-700 font-medium">{comment.user}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(comment.status)}`}>
                            {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{comment.content}</p>
                      </div>

                      <div className="flex items-center space-x-2 ml-6">
                        {comment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateCommentStatus(comment.id, 'approved')}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => updateCommentStatus(comment.id, 'resolved')}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mark as resolved"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Reply"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-6">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-gray-700 font-medium text-sm">{reply.user}</span>
                              <span className="text-gray-500 text-xs">{reply.createdAt}</span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <div className="ml-6 mt-4 border-l-2 border-gray-200 pl-6">
                        <textarea
                          value={newReply}
                          onChange={(e) => setNewReply(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          rows={2}
                        />
                        <div className="flex items-center justify-end space-x-3 mt-3">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => addReply(comment.id)}
                            disabled={!newReply.trim()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaveformPlayer