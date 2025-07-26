import { NextRequest } from 'next/server'
import { getUserFromSession, AuthUser } from './auth'

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const sessionToken = request.cookies.get('session_token')?.value
  
  if (!sessionToken) {
    return null
  }

  try {
    return await getUserFromSession(sessionToken)
  } catch (error) {
    console.error('Error getting user from session:', error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return handler(request, user)
  }
}