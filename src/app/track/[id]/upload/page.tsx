"use client";

import { useParams, useRouter } from "next/navigation";
import AudioUpload from "@/components/audio/AudioUpload";
import Link from "next/link";
import { useState } from "react";

export default function TrackUploadPage() {
  const params = useParams();
  const router = useRouter();
  const trackId = params.id as string;
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const handleRemoveTrack = async () => {
    if (!trackId) return;
    setRemoving(true);
    setRemoveError("");
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setRemoveError(data.error || "Failed to remove track.");
      }
    } catch (err: any) {
      setRemoveError(err.message || "Failed to remove track.");
    } finally {
      setRemoving(false);
    }
  };

  if (!trackId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 font-bold text-xl mb-4">No track ID provided.</div>
        <Link href="/dashboard" className="text-indigo-600 hover:underline">Back to Dashboard</Link>
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
                    <p className="text-red-300 text-sm">Upload Mixes</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href={`/track/${trackId}`} className="px-4 py-2 bg-red-700/50 hover:bg-red-700/70 text-red-100 rounded-lg transition-colors font-medium">Back to Track</Link>
                <Link href="/dashboard" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">Dashboard</Link>
              </div>
            </div>
          </div>
        </header>
        {/* Main Card */}
        <main className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Mixes for Track</h1>
            <p className="text-gray-600 mb-6">Upload your Stereo, Atmos, and Reference mixes for this track.</p>
            <div className="space-y-8">
              <AudioUpload trackId={trackId} versionType="STEREO" />
              <AudioUpload trackId={trackId} versionType="ATMOS" />
              <AudioUpload trackId={trackId} versionType="REFERENCE" />
            </div>
            <div className="mt-10 flex flex-col items-center">
              <button
                onClick={handleRemoveTrack}
                disabled={removing}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors border border-red-300 mb-2 disabled:opacity-60"
              >
                {removing ? 'Removing Track...' : 'Remove Track from Album'}
              </button>
              {removeError && <div className="text-red-600 text-sm mt-1">{removeError}</div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 