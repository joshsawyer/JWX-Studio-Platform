
import crypto from 'crypto'
import { prisma } from './db'

export interface AuthUser {
  id: string
  email: string
  name: string
  phone?: string
  profilePicture?: string
  role: 'ADMIN' | 'ENGINEER' | 'CLIENT'
}

// Generate salt for password hashing
export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Hash password with salt
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
}

// Verify password
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = hashPassword(password, salt)
  return testHash === hash
}

// Generate session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Create user session
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  })

  return token
}

// Get user from session token
export async function getUserFromSession(token: string): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } })
    }
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone || undefined,
    profilePicture: session.user.profilePicture || undefined,
    role: session.user.role as 'ADMIN' | 'ENGINEER' | 'CLIENT'
  }
}

// Delete session (logout)
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token }
  })
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
}