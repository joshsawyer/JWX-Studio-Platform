// src/app/track/[id]/page.tsx
"use client"; // This component uses client-side hooks

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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

  const getCurrentAudioVersionId = () => {
    const currentVersion = getCurrentAudioVersion();
    return currentVersion?.id;
  };

  const getAvailableMixes = (): ('STEREO' | 'ATMOS' | 'REFERENCE')[] => {
    if (!track) return [];
    return Array.from(new Set(track.audioVersions.map(v => v.versionType)));
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
        {/* Simplified Header */}
        <header className="bg-black/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JWX</span>
                </div>
                <span className="text-white font-semibold">Studio</span>
              </div>
              <nav className="flex items-center space-x-3">
                <Link href={`/project/${track.project.id}`} className="px-3 py-2 text-red-200 hover:text-white hover:bg-red-700/30 rounded-lg transition-colors text-sm font-medium">
                  ← Album
                </Link>
                <Link href="/dashboard" className="px-3 py-2 text-red-200 hover:text-white hover:bg-red-700/30 rounded-lg transition-colors text-sm font-medium">
                  Dashboard
                </Link>
              </nav>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-6">
          {/* Track Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{track.name}</h1>
                <p className="text-lg text-gray-600">{track.project.artist}</p>
                <p className="text-sm text-gray-500">{track.project.name}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Link 
                  href={`/track/${track.id}/upload`}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <span>Upload Audio</span>
                </Link>
                {track.bpm && (
                  <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    {track.bpm} BPM
                  </div>
                )}
                {track.key && (
                  <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    Key: {track.key}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audio Player Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
            {/* Mix Version Selection */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Audio Versions</h3>
                <div className="text-sm text-gray-500">
                  {getAvailableMixes().length} of 3 versions available
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                {(['STEREO', 'ATMOS', 'REFERENCE'] as const).map((type) => {
                  const isAvailable = getAvailableMixes().includes(type)
                  const isSelected = selectedVersionType === type
                  
                  let config = {
                    icon: <circle cx="7" cy="12" r="3"/>,
                    label: 'Stereo',
                    description: 'Standard stereo mix',
                    color: 'green'
                  }
                  
                  if (type === 'STEREO') {
                    config = {
                      icon: <><circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/></>,
                      label: 'Stereo',
                      description: 'Standard stereo mix',
                      color: 'green'
                    }
                  } else if (type === 'ATMOS') {
                    config = {
                      icon: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></>,
                      label: 'Atmos',
                      description: 'Spatial audio mix',
                      color: 'blue'
                    }
                  } else if (type === 'REFERENCE') {
                    config = {
                      icon: <rect x="4" y="8" width="16" height="8" rx="2"/>,
                      label: 'Reference',
                      description: 'Reference track',
                      color: 'purple'
                    }
                  }
                  
                  const getButtonClasses = () => {
                    let classes = 'relative p-6 rounded-xl border-2 transition-all duration-200 text-left '
                    
                    if (isSelected && isAvailable) {
                      if (config.color === 'green') classes += 'border-green-600 bg-green-50 shadow-lg'
                      else if (config.color === 'blue') classes += 'border-blue-600 bg-blue-50 shadow-lg'
                      else if (config.color === 'purple') classes += 'border-purple-600 bg-purple-50 shadow-lg'
                    } else if (isAvailable) {
                      classes += 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    } else {
                      classes += 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }
                    
                    return classes
                  }
                  
                  const getCheckmarkClasses = () => {
                    let classes = 'absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center '
                    if (config.color === 'green') classes += 'bg-green-600'
                    else if (config.color === 'blue') classes += 'bg-blue-600'
                    else if (config.color === 'purple') classes += 'bg-purple-600'
                    return classes
                  }
                  
                  const getIconClasses = () => {
                    let classes = 'w-12 h-12 rounded-lg flex items-center justify-center mb-3 '
                    
                    if (isSelected && isAvailable) {
                      if (config.color === 'green') classes += 'bg-green-600 text-white'
                      else if (config.color === 'blue') classes += 'bg-blue-600 text-white'
                      else if (config.color === 'purple') classes += 'bg-purple-600 text-white'
                    } else if (isAvailable) {
                      if (config.color === 'green') classes += 'bg-green-100 text-green-600'
                      else if (config.color === 'blue') classes += 'bg-blue-100 text-blue-600'
                      else if (config.color === 'purple') classes += 'bg-purple-100 text-purple-600'
                    } else {
                      classes += 'bg-gray-200 text-gray-400'
                    }
                    
                    return classes
                  }
                  
                  return (
                    <button
                      key={type}
                      onClick={() => isAvailable && setSelectedVersionType(type)}
                      disabled={!isAvailable}
                      className={getButtonClasses()}
                    >
                      {isSelected && isAvailable && (
                        <div className={getCheckmarkClasses()}>
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      <div className={getIconClasses()}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          {config.icon}
                        </svg>
                      </div>
                      
                      <div>
                        <h4 className={`font-semibold text-base mb-1 ${
                          isAvailable ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {config.label}
                          {!isAvailable && <span className="ml-2 text-xs font-normal">(Unavailable)</span>}
                        </h4>
                        <p className={`text-sm ${
                          isAvailable ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {config.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
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
                trackId={track.id}
                projectId={track.project.id}
                audioVersionId={getCurrentAudioVersionId()}
                onReady={() => console.log('Waveform Player is ready')}
                onTimeUpdate={(time) => console.log('Current time:', time)}
              />
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M7 4V2C7 1.45 7.45 1 8 1s1 .45 1 1v2h6V2c0-.55.45-1 1-1s1 .45 1 1v2h1c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h1zM6 8v10h12V8H6z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 font-medium mb-2">No audio available</p>
                    <p className="text-gray-500 text-sm mb-4">No audio versions found for the selected mix type.</p>
                    <Link
                      href={`/track/${track.id}/upload`}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      Upload Audio
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
