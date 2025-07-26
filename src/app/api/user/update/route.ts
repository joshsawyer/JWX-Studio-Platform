import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'
import { verifyPassword, generateSalt, hashPassword } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone, currentPassword, newPassword } = body

    // Validate name
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone || null
    }

    // Handle password change if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'New password must be at least 8 characters long' },
          { status: 400 }
        )
      }

      // Get current user data with password
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true, salt: true }
      })

      if (!currentUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Verify current password
      const isCurrentPasswordValid = verifyPassword(
        currentPassword, 
        currentUser.passwordHash, 
        currentUser.salt
      )

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Hash new password
      const newSalt = generateSalt()
      const newPasswordHash = hashPassword(newPassword, newSalt)

      updateData.passwordHash = newPasswordHash
      updateData.salt = newSalt
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profilePicture: true,
        role: true
      }
    })

    return NextResponse.json({
      user: updatedUser,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}