'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioSource {
  url: string
  type: 'stereo' | 'atmos' | 'reference'
  audioVersionId: string
  versionNumber?: number
  isActive?: boolean
}

interface SimpleAudioPlayerProps {
  audioSources: AudioSource[]
  trackName: string
  artistName: string
  albumName: string
  currentMix: 'stereo' | 'atmos' | 'reference'
  trackId?: string
  onVersionChange?: (version: 'STEREO' | 'ATMOS' | 'REFERENCE') => void
}

interface Comment {
  id: string
  timestampMs: number
  content: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  status: 'PENDING' | 'APPROVED' | 'RESOLVED'
  audioVersionId: string
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
  replies?: CommentReply[]
}

interface CommentReply {
  id: string
  content: string
  createdAt: string
  comment: {
    user: {
      id: string
      name: string
      role: string
    }
  }
}

const SimpleAudioPlayer = ({
  audioSources = [],
  trackName,
  artistName,
  albumName,
  currentMix,
  trackId,
  onVersionChange
}: SimpleAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [commentTimestamp, setCommentTimestamp] = useState(0)
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const getCurrentAudioSource = () => {
    return audioSources.find(source => source.type === currentMix && source.isActive !== false)
  }

  const getAudioUrl = (source: AudioSource) => {
    return source.url.startsWith('/api/') ? source.url : `/api/audio-stream/${source.url.replace('/uploads/', '').replace('uploads/', '')}`
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const currentSource = getCurrentAudioSource()
    if (!currentSource) {
      setError('No audio source available for this mix')
      return
    }

    const wasPlaying = !audio.paused
    const currentTimePosition = audio.currentTime

    console.log(`Loading ${currentMix} audio:`, getAudioUrl(currentSource))
    
    setError(null)
    setIsLoading(true)
    
    // Force reload by setting src to empty first
    audio.src = ''
    audio.load()
    
    // Then set the new source
    audio.src = getAudioUrl(currentSource)
    audio.volume = volume
    audio.load() // Force reload
    
    // Restore position after loading
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      if (currentTimePosition < audio.duration) {
        audio.currentTime = currentTimePosition
      }
      if (wasPlaying) {
        audio.play().catch(err => console.error('Play failed:', err))
      }
    }

    const handleError = () => {
      setError(`Failed to load ${currentMix} audio`)
      setIsLoading(false)
      console.error('Audio load error:', audio.error)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentMix, audioSources, volume])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      audio.play().catch(err => console.error('Play failed:', err))
    } else {
      audio.pause()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const switchVersion = (newMix: 'stereo' | 'atmos' | 'reference') => {
    if (newMix === currentMix) return
    
    const versionMap = { 'stereo': 'STEREO', 'atmos': 'ATMOS', 'reference': 'REFERENCE' } as const
    onVersionChange?.(versionMap[newMix])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVersionsForType = (type: 'stereo' | 'atmos' | 'reference') => {
    return audioSources.filter(source => source.type === type)
  }

  // Comments functionality
  const fetchComments = async () => {
    if (!trackId) return
    
    try {
      const response = await fetch(`/api/comments?trackId=${trackId}`)
      if (response.ok) {
        const fetchedComments = await response.json()
        setComments(fetchedComments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [trackId])

  const addComment = async () => {
    if (!newComment.trim() || !trackId) return

    const currentSource = getCurrentAudioSource()
    if (!currentSource?.audioVersionId) return

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment.trim(),
          timestampMs: commentTimestamp,
          trackId,
          audioVersionId: currentSource.audioVersionId,
          versionType: currentMix.toUpperCase()
        })
      })

      if (response.ok) {
        const newCommentData = await response.json()
        setComments([...comments, newCommentData])
        setNewComment('')
        setIsAddingComment(false)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const getCurrentVersionComments = () => {
    const currentSource = getCurrentAudioSource()
    if (!currentSource?.audioVersionId) return []
    
    return comments.filter(comment => 
      comment.audioVersionId === currentSource.audioVersionId ||
      comment.versionType === currentMix.toUpperCase()
    )
  }

  const getStatusColor = (status: Comment['status']) => {
    switch (status) {
      case 'APPROVED': return 'text-green-700 bg-green-100'
      case 'RESOLVED': return 'text-blue-700 bg-blue-100'
      default: return 'text-amber-700 bg-amber-100'
    }
  }

  const seekToTime = (timeMs: number) => {
    const audio = audioRef.current
    if (!audio) return

    const seekTime = timeMs / 1000
    audio.currentTime = Math.max(0, Math.min(duration, seekTime))
    setCurrentTime(seekTime)
  }

  const updateCommentStatus = async (commentId: string, newStatus: Comment['status']) => {
    if (!trackId) return

    try {
      const response = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          status: newStatus
        })
      })

      if (response.ok) {
        // Update local state immediately
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, status: newStatus }
              : comment
          )
        )
      } else {
        const errorData = await response.json()
        console.error('Failed to update comment status:', errorData)
      }
    } catch (error) {
      console.error('Error updating comment status:', error)
    }
  }

  const addReply = async (commentId: string) => {
    if (!replyContent.trim() || !trackId) return

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          content: replyContent.trim()
        })
      })

      if (response.ok) {
        const newReply = await response.json()
        
        // Update local state to include the new reply
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, replies: [...(comment.replies || []), newReply] }
              : comment
          )
        )
        
        setReplyContent('')
        setReplyingTo(null)
      } else {
        const errorData = await response.json()
        console.error('Failed to add reply:', errorData)
      }
    } catch (error) {
      console.error('Error adding reply:', error)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl">
        <div className="text-red-600 text-center">
          <div className="font-semibold mb-2">Error Loading Audio</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <audio ref={audioRef} />
      
      {/* Track Info */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">{trackName}</h3>
        <p className="text-gray-600">{artistName} - {albumName}</p>
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-500">Playing: {currentMix}</p>
          {isLoading && (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border border-red-600 border-t-transparent"></div>
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Version Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {(['stereo', 'atmos', 'reference'] as const).map((type) => {
            const versions = getVersionsForType(type)
            const hasVersions = versions.length > 0
            
            return (
              <button
                key={type}
                onClick={() => hasVersions && switchVersion(type)}
                disabled={!hasVersions}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  type === currentMix && hasVersions
                    ? 'bg-red-600 text-white'
                    : hasVersions 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {versions.length > 1 && (
                  <span className="ml-1 text-xs">({versions.length})</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Progress Bar with Comment Markers */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={duration > 0 ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer relative z-10"
          />
          
          {/* Comment Markers */}
          {duration > 0 && getCurrentVersionComments().map((comment) => {
            const position = (comment.timestampMs / 1000) / duration * 100
            const colorClass = comment.status === 'APPROVED' ? 'bg-green-400' : 
                              comment.status === 'RESOLVED' ? 'bg-blue-400' : 'bg-amber-400'
            
            return (
              <div
                key={comment.id}
                className={`absolute top-1/2 w-2 h-2 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 border border-white shadow-sm hover:w-2.5 hover:h-2.5 transition-all z-20 ${colorClass}`}
                style={{ left: `${position}%` }}
                onClick={() => seekToTime(comment.timestampMs)}
                title={`${formatTime(comment.timestampMs / 1000)} - ${comment.content.substring(0, 40)}${comment.content.length > 40 ? '...' : ''}`}
              />
            )
          })}
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          {getCurrentVersionComments().length > 0 && (
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Approved</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Resolved</span>
              </div>
            </div>
          )}
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="flex items-center justify-center w-12 h-12 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-full transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3">
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
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-600 w-8">{Math.round(volume * 100)}%</span>
        </div>

        <button
          onClick={() => {
            setIsAddingComment(true)
            setCommentTimestamp(currentTime * 1000)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span>Add Comment</span>
        </button>
      </div>

      {/* Add Comment Section */}
      {isAddingComment && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600 font-medium">
              Adding comment at {formatTime(commentTimestamp / 1000)}
            </div>
            <button
              onClick={() => setIsAddingComment(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Enter your feedback..."
            className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-end space-x-3 mt-3">
            <button
              onClick={() => setIsAddingComment(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
            >
              Add Comment
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-800">
            Comments ({getCurrentVersionComments().length})
          </h4>
          <div className="text-xs text-gray-500">
            Click timeline markers to jump to comments
          </div>
        </div>

        {getCurrentVersionComments().map((comment) => (
          <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <button
                    onClick={() => seekToTime(comment.timestampMs)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                  >
                    {formatTime(comment.timestampMs / 1000)}
                  </button>
                  <span className="text-gray-700 font-medium text-sm">{comment.user.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comment.status)}`}>
                    {comment.status.charAt(0).toUpperCase() + comment.status.slice(1)}
                  </span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed mb-3">{comment.content}</p>
                
                {/* Status Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Mark as:</span>
                    {(['PENDING', 'APPROVED', 'RESOLVED'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateCommentStatus(comment.id, status)}
                        disabled={comment.status === status}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          comment.status === status
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : status === 'APPROVED'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : status === 'RESOLVED'
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                  </button>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-gray-50 rounded p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-700">{reply.comment.user.name}</span>
                          <span className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-800">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full p-2 bg-white border border-blue-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex items-center justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => addReply(comment.id)}
                        disabled={!replyContent.trim()}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {getCurrentVersionComments().length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No comments for this version yet.</p>
            <p className="text-xs mt-1">Click &quot;Add Comment&quot; to leave feedback at the current time.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleAudioPlayer