import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// POST /api/tracks - Create new track
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
    const { name, trackNumber, bpm, key, projectId } = body

    if (!name || !projectId) {
      return NextResponse.json(
        { error: 'Track name and project ID are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: { 
        id: projectId,
        ...(user.role === 'CLIENT' ? { userId: user.id } : {})
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const track = await prisma.track.create({
      data: {
        name: name.trim(),
        trackNumber: trackNumber || null,
        bpm: bpm || null,
        key: key?.trim() || null,
        projectId
      },
      include: {
        audioVersions: {
          select: {
            id: true,
            versionType: true,
            fileName: true,
            isNormalized: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    })

    return NextResponse.json(track, { status: 201 })

  } catch (error) {
    console.error('Error creating track:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}