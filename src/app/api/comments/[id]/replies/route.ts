import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// POST /api/comments/[id]/replies - Add reply to comment
export async function POST(
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

    const { id: commentId } = await params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
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

    // Check permissions - user must have access to the project
    if (user.role === 'CLIENT' && comment.track.project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const reply = await prisma.commentReply.create({
      data: {
        content: content.trim(),
        commentId,
        userId: user.id
      }
    })

    // Return the reply with user information
    const replyWithUser = await prisma.commentReply.findUnique({
      where: { id: reply.id },
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

    return NextResponse.json(replyWithUser, { status: 201 })
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}