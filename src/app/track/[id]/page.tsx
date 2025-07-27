// src/app/track/[id]/page.tsx
"use client"; // This component uses client-side hooks

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import WaveformPlayer from '@/components/audio/WaveformPlayer';

interface AudioVersion {
  id: string;
  versionType: 'STEREO' | 'ATMOS' | 'REFERENCE';
  fileName: string;
  filePath: string;
  isNormalized: boolean;
  lufsLevel?: number;
}

interface Track {
  id: string;
  name: string;
  trackNumber?: number;
  duration?: number;
  bpm?: number;
  key?: string;
  audioVersions: AudioVersion[];
  project: {
    id: string;
    name: string;
    artist: string;
    coverImage?: string;
  };
}

export default function TrackPage() {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionType, setSelectedVersionType] = useState<'STEREO' | 'ATMOS' | 'REFERENCE'>('STEREO');
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  const params = useParams();
  const trackId = params.id as string;
  const router = useRouter();

  useEffect(() => {
    if (trackId) {
      fetchTrack();
    }
  }, [trackId]);

  useEffect(() => {
    if (track && track.audioVersions.length > 0) {
      const currentVersion = getCurrentAudioVersion();
      if (currentVersion) {
        // Clean the filePath by removing any leading '/uploads/' if it exists
        const cleanedFilePath = currentVersion.filePath.startsWith('/uploads/')
          ? currentVersion.filePath.substring('/uploads/'.length)
          : currentVersion.filePath;
        const generatedUrl = `/api/audio-stream/${cleanedFilePath}`;
        setCurrentAudioUrl(generatedUrl);
        // Log the URL being passed to WaveformPlayer
        console.log('TrackPage: Generated audio URL for WaveformPlayer:', generatedUrl);
      } else {
        setCurrentAudioUrl(null);
        console.log('TrackPage: No current audio version found for selected mix type.');
      }
    } else if (track && track.audioVersions.length === 0) {
      setCurrentAudioUrl(null);
      console.log('TrackPage: No audio versions available for this track.');
    }
  }, [track, selectedVersionType]);

  const fetchTrack = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tracks/${trackId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.statusText}`);
      }
      const data = await response.json();
      setTrack(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentAudioVersion = () => {
    return track?.audioVersions.find(v => v.versionType === selectedVersionType);
  };

  const getAvailableMixes = (): ('STEREO' | 'ATMOS' | 'REFERENCE')[] => {
    if (!track) return [];
    return Array.from(new Set(track.audioVersions.map(v => v.versionType)));
  };

  const handleMixChange = (mixType: 'stereo' | 'atmos' | 'reference') => {
    setSelectedVersionType(mixType.toUpperCase() as 'STEREO' | 'ATMOS' | 'REFERENCE');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span>Loading track...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <Link 
            href="/dashboard"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Track not found.</div>
          <Link 
            href="/dashboard"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grid\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\"><path d=\"M 10 0 L 0 0 0 10\" fill=\"none\" stroke=\"%23ffffff\" stroke-width=\"0.5\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grid)\"/></svg>')`,
          backgroundSize: '50px 50px'
        }}
      />
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-sm border-b border-red-900/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">JWX</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">JWX Studio</h1>
                    <p className="text-red-300 text-sm">Track Details</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href={`/project/${track.project.id}`} className="px-4 py-2 bg-red-700/50 hover:bg-red-700/70 text-red-100 rounded-lg transition-colors font-medium">Back to Album</Link>
                <Link href="/dashboard" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">Dashboard</Link>
              </div>
            </div>
          </div>
        </header>
        {/* Main Card */}
        <main className="max-w-7xl mx-auto py-16 px-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{track.name}</h1>
            <p className="text-gray-600 mb-6">{track.project.artist} - {track.project.name}</p>
            <div className="mb-8">
              {/* Mix Version Toggle */}
              <div className="flex items-center space-x-4 mb-6">
                {(['STEREO', 'ATMOS', 'REFERENCE'] as const).map((type) => {
                  const isAvailable = getAvailableMixes().includes(type)
                  const isSelected = selectedVersionType === type
                  let icon = null
                  let color = ''
                  if (type === 'STEREO') {
                    icon = (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/></svg>
                    )
                    color = isSelected ? 'bg-green-600 text-white' : isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'
                  } else if (type === 'ATMOS') {
                    icon = (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>
                    )
                    color = isSelected ? 'bg-blue-600 text-white' : isAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-400'
                  } else if (type === 'REFERENCE') {
                    icon = (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="8" rx="2"/></svg>
                    )
                    color = isSelected ? 'bg-purple-600 text-white' : isAvailable ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-400'
                  }
                  return (
                    <button
                      key={type}
                      onClick={() => isAvailable && setSelectedVersionType(type)}
                      disabled={!isAvailable}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none ${color} ${isAvailable ? 'hover:scale-105' : 'cursor-not-allowed'}`}
                      style={{ minWidth: 110 }}
                    >
                      {icon}
                      <span>{type.charAt(0) + type.slice(1).toLowerCase()}</span>
                      {!isAvailable && <span className="ml-1 text-xs">(N/A)</span>}
                    </button>
                  )
                })}
              </div>
              {currentAudioUrl ? (
                <WaveformPlayer
                  key={`${track.id}-${selectedVersionType}-${currentAudioUrl}`}
                  audioUrl={currentAudioUrl}
                  trackName={track.name}
                  artistName={track.project.artist}
                  albumName={track.project.name}
                  height={120}
                  currentMix={selectedVersionType.toLowerCase() as 'stereo' | 'atmos' | 'reference'}
                  availableMixes={getAvailableMixes()}
                  onMixChange={handleMixChange}
                  trackId={track.id}
                  projectId={track.project.id}
                  onReady={() => console.log('Waveform Player is ready')}
                  onTimeUpdate={(time) => console.log('Current time:', time)}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No audio versions available for the selected mix type.</p>
                  <Link
                    href={`/track/${track.id}/upload`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Upload New Audio
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
