'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    try {
      const response = await fetch('/api/user/me')
      if (response.ok) {
        // User is authenticated, redirect to dashboard
        router.push('/dashboard')
      } else {
        // User is not authenticated, redirect to auth page
        router.push('/auth')
      }
    } catch (error) {
      // Network error or no response, redirect to auth
      router.push('/auth')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">JWX</span>
        </div>
        <div className="text-white text-xl flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
          <span>Loading JWX Studio...</span>
        </div>
      </div>
    </div>
  )
}