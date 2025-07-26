'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import WaveformPlayer from '@/components/audio/WaveformPlayer'

interface AudioVersion {
  id: string
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE'
  fileName: string
  filePath: string
  isNormalized: boolean
  lufsLevel?: number
}

interface Track {
  id: string
  name: string
  trackNumber?: number
  duration?: number
  bpm?: number
  key?: string
  audioVersions: AudioVersion[]
  project: {
    id: string
    name: string
    artist: string
    coverImage?: string
  }
}

export default function TrackPage() {
  const params = useParams()
  const router = useRouter()
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMix, setCurrentMix] = useState<'STEREO' | 'ATMOS' | 'REFERENCE'>('STEREO')

  useEffect(() => {
    if (params.id) {
      fetchTrack()
    }
  }, [params.id])

  const fetchTrack = async () => {
    try {
      console.log('Fetching track:', params.id)
      const response = await fetch(`/api/tracks/${params.id}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Track data:', data)
        setTrack(data)
        
        // Set default mix to the first available version
        if (data.audioVersions && data.audioVersions.length > 0) {
          const hasStereo = data.audioVersions.find((v: AudioVersion) => v.versionType === 'STEREO')
          const hasAtmos = data.audioVersions.find((v: AudioVersion) => v.versionType === 'ATMOS')
          const hasReference = data.audioVersions.find((v: AudioVersion) => v.versionType === 'REFERENCE')
          
          if (hasStereo) setCurrentMix('STEREO')
          else if (hasAtmos) setCurrentMix('ATMOS')
          else if (hasReference) setCurrentMix('REFERENCE')
        }
      } else if (response.status === 404) {
        setError('Track not found')
      } else {
        setError('Failed to load track')
      }
    } catch (error) {
      console.error('Error fetching track:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentAudioVersion = () => {
    if (!track) return null
    return track.audioVersions.find(version => version.versionType === currentMix)
  }

  const getAvailableMixes = () => {
    if (!track) return []
    return track.audioVersions.map(version => version.versionType)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span>Loading track...</span>
        </div>
      </div>
    )
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error || 'Track not found'}</div>
          <button 
            onClick={() => router.back()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const currentVersion = getCurrentAudioVersion()
  const availableMixes = getAvailableMixes()

  if (!currentVersion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">No audio versions available for this track</div>
          <div className="text-red-300 mb-4">You need to add audio files for this track</div>
          <button 
            onClick={() => router.back()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <WaveformPlayer
      audioUrl={currentVersion.filePath}
      trackName={track.name}
      artistName={track.project.artist}
      albumName={track.project.name}
      height={150}
      currentMix={currentMix.toLowerCase() as 'stereo' | 'atmos' | 'reference'}
      availableMixes={availableMixes}
      onMixChange={(mix) => {
        const upperMix = mix.toUpperCase() as 'STEREO' | 'ATMOS' | 'REFERENCE'
        setCurrentMix(upperMix)
      }}
      trackId={track.id}
      projectId={track.project.id}
      onReady={() => console.log('Track player ready!')}
      onTimeUpdate={(time) => console.log('Current time:', time)}
    />
  )
}