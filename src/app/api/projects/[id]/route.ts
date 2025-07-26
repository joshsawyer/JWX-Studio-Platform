import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Fetching project with ID:', id)

    const project = await prisma.project.findUnique({
      where: { 
        id: id
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
          },
          orderBy: [
            { trackNumber: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    })

    console.log('Project found:', project ? 'Yes' : 'No')

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found in database' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}