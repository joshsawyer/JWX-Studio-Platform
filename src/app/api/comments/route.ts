import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// GET /api/comments - Get comments for a track/audioVersion
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    const audioVersionId = searchParams.get('audioVersionId')

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      )
    }

    const whereClause: { trackId: string; audioVersionId?: string } = { trackId }
    if (audioVersionId) {
      whereClause.audioVersionId = audioVersionId
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
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
      },
      orderBy: {
        timestampMs: 'asc'
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/comments - Create new comment
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
    const { content, timestampMs, trackId, audioVersionId, versionType } = body

    if (!content || typeof timestampMs !== 'number' || !trackId || !audioVersionId) {
      return NextResponse.json(
        { error: 'content, timestampMs, trackId, and audioVersionId are required' },
        { status: 400 }
      )
    }

    // Verify the track and audioVersion exist and user has access
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        project: {
          select: {
            userId: true
          }
        },
        audioVersions: {
          where: { id: audioVersionId }
        }
      }
    })

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    if (track.audioVersions.length === 0) {
      return NextResponse.json(
        { error: 'Audio version not found' },
        { status: 404 }
      )
    }

    // Check permissions - user must be project owner or engineer/admin
    if (user.role === 'CLIENT' && track.project.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        timestampMs,
        trackId,
        audioVersionId,
        versionType: versionType || 'STEREO',
        userId: user.id
      },
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
          }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

// PATCH /api/comments - Update comment status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { commentId, status } = body

    if (!commentId || !status) {
      return NextResponse.json(
        { error: 'commentId and status are required' },
        { status: 400 }
      )
    }

    if (!['PENDING', 'APPROVED', 'RESOLVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, APPROVED, or RESOLVED' },
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
    const canUpdateStatus = 
      user.role === 'ADMIN' ||
      user.role === 'ENGINEER' ||
      comment.track.project.userId === user.id ||
      comment.userId === user.id

    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment status:', error)
    return NextResponse.json(
      { error: 'Failed to update comment status' },
      { status: 500 }
    )
  }
}