import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// PUT /api/comments/[id] - Update comment status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['PENDING', 'APPROVED', 'RESOLVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (PENDING, APPROVED, RESOLVED, REJECTED)' },
        { status: 400 }
      )
    }

    // Find the comment and check permissions
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        track: {
          include: {
            project: {
              select: {
                userId: true
              }
            }
          }
        },
        user: {
          select: {
            id: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check permissions - engineers/admins can change any status, clients can only change their own comments
    const canUpdateStatus = user.role === 'ENGINEER' || user.role === 'ADMIN' || 
                           (user.role === 'CLIENT' && comment.track.project.userId === user.id)

    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions to update comment status' },
        { status: 403 }
      )
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        replies: {
          include: {
            comment: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/comments/[id] - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Find the comment and check permissions
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        track: {
          include: {
            project: {
              select: {
                userId: true
              }
            }
          }
        },
        user: {
          select: {
            id: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check permissions - users can delete their own comments, engineers/admins can delete any, project owners can delete comments on their projects
    const canDelete = comment.user.id === user.id || 
                     user.role === 'ENGINEER' || 
                     user.role === 'ADMIN' ||
                     (user.role === 'CLIENT' && comment.track.project.userId === user.id)

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden - insufficient permissions to delete comment' },
        { status: 403 }
      )
    }

    // Delete the comment (cascading deletes should handle replies and approvals)
    await prisma.comment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}