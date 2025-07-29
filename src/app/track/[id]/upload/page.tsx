"use client";

import { useParams, useRouter } from "next/navigation";
import AudioUpload from "@/components/audio/AudioUpload";
import Link from "next/link";
import { useState } from "react";

type VersionType = "STEREO" | "ATMOS" | "REFERENCE";

export default function TrackUploadPage() {
  const params = useParams();
  const router = useRouter();
  const trackId = params.id as string;
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [activeTab, setActiveTab] = useState<VersionType>("STEREO");

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

  const tabs: { id: VersionType; label: string; description: string }[] = [
    { id: "STEREO", label: "Stereo Mix", description: "Standard stereo audio file" },
    { id: "ATMOS", label: "Atmos Mix", description: "Dolby Atmos spatial audio" },
    { id: "REFERENCE", label: "Reference", description: "Reference track for comparison" },
  ];

  if (!trackId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900">
        <div className="text-red-400 font-bold text-xl mb-4">No track ID provided.</div>
        <Link href="/dashboard" className="text-red-300 hover:text-red-100 transition-colors">Back to Dashboard</Link>
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

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Upload Track Mixes</h1>
            <p className="text-gray-300">Upload your Stereo, Atmos, and Reference mixes for this track.</p>
          </div>

          {/* Mix Type Selector */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <label className="text-white font-medium text-lg">Mix Type:</label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as VersionType)}
                className="bg-black/60 border border-red-900/50 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id} className="bg-gray-900">
                    {tab.label}
                  </option>
                ))}
              </select>
              <span className="text-gray-400 text-sm">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </span>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-red-900/30 p-8 mb-8">
            <AudioUpload trackId={trackId} versionType={activeTab} />
          </div>

          {/* Remove Track Section */}
          <div className="bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-700/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-red-200 mb-1">Danger Zone</h3>
                <p className="text-red-300/80 text-sm">Remove this track from the album permanently.</p>
              </div>
              <button
                onClick={handleRemoveTrack}
                disabled={removing}
                className="px-6 py-3 bg-red-700/50 hover:bg-red-600 text-red-100 rounded-lg font-medium transition-colors border border-red-600/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {removing ? 'Removing Track...' : 'Remove Track'}
              </button>
            </div>
            {removeError && (
              <div className="mt-4 p-3 bg-red-800/30 border border-red-600/50 rounded-lg">
                <div className="text-red-200 text-sm">{removeError}</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}