'use client'

import React from 'react'

interface SimpleAudioProps {
  audioUrl: string
  label: string
}

const SimpleAudioTest = ({ audioUrl, label }: SimpleAudioProps) => {
  return (
    <div className="bg-gray-700 p-4 rounded">
      <h4 className="text-white mb-2">{label}</h4>
      <div className="text-sm text-gray-400 mb-2">URL: {audioUrl}</div>
      <audio controls className="w-full">
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        Your browser does not support audio.
      </audio>
    </div>
  )
}

export default SimpleAudioTest