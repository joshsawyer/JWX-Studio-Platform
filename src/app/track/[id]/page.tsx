// src/app/track/[id]/page.tsx
"use client"; // This component uses client-side hooks

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import WaveformPlayer from '@/components/audio/WaveformPlayer';
// AudioUpload is not directly used here, but imported if needed for a modal within this page
// import AudioUpload from '@/components/audio/AudioUpload';

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
  // Removed showUploadModal from here, as upload functionality will be in a separate route/modal
  // const [showUploadModal, setShowUploadModal] = useState(false);

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
        setCurrentAudioUrl(`/api/audio-stream/${cleanedFilePath}`);
      } else {
        setCurrentAudioUrl(null);
      }
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
      <div className="flex justify-center items-center min-h-screen">
        Loading track...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Track not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">{track.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {track.project.artist} - {track.project.name}
          </p>
          {/* Back to Project Link */}
          <Link href={`/project/${track.project.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm mt-2 block">
            &larr; Back to Project
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Audio Versions
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage audio files for this track.
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="p-6">
                {currentAudioUrl ? (
                  <WaveformPlayer
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
                    {/* Link to the separate upload page */}
                    <Link
                      href={`/track/${track.id}/upload`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Upload New Audio
                    </Link>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {['STEREO', 'ATMOS', 'REFERENCE'].map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedVersionType(type as 'STEREO' | 'ATMOS' | 'REFERENCE')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedVersionType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {type} ({track.audioVersions.filter(v => v.versionType === type).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
