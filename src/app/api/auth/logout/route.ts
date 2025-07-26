import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const sessionToken = request.headers.get('cookie')
      ?.split(';')
      .find(c => c.trim().startsWith('session_token='))
      ?.split('=')[1]

    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    const response = NextResponse.json({ success: true })
    
    // Clear session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}