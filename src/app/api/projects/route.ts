import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

// GET /api/projects - Get all projects for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const projects = await prisma.project.findMany({
      where: {
        // Show all projects for admin/engineer, only own projects for clients
        ...(user.role === 'CLIENT' ? { userId: user.id } : {})
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        tracks: {
          include: {
            audioVersions: {
              select: {
                id: true,
                versionType: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
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
    const { name, artist, description, coverImage } = body

    if (!name || !artist) {
      return NextResponse.json(
        { error: 'Name and artist are required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        artist,
        description: description || null,
        coverImage: coverImage || null,
        userId: user.id
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        tracks: true
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}