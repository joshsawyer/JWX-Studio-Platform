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

    if (!trackId || !audioVersionId) {
      return NextResponse.json(
        { error: 'trackId and audioVersionId are required' },
        { status: 400 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: {
        trackId,
        audioVersionId
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
    const { content, timestampMs, trackId, audioVersionId } = body

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