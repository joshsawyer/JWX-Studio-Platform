import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// POST /api/comments/reply - Create a reply to a comment
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { commentId, content } = body

    if (!commentId || !content) {
      return NextResponse.json(
        { error: 'commentId and content are required' },
        { status: 400 }
      )
    }

    // Verify the comment exists and user has access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        track: {
          include: {
            project: {
              select: {
                userId: true
              }
            }
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

    // Check permissions - user must be project owner, comment author, or engineer/admin
    const canReply = 
      user.role === 'ADMIN' ||
      user.role === 'ENGINEER' ||
      comment.track.project.userId === user.id ||
      comment.userId === user.id

    if (!canReply) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const reply = await prisma.commentReply.create({
      data: {
        content,
        commentId,
        userId: user.id
      },
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
      }
    })

    return NextResponse.json(reply, { status: 201 })
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}