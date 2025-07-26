import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Fetching track with ID:', id)

    const track = await prisma.track.findUnique({
      where: { 
        id: id
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            artist: true,
            coverImage: true,
            userId: true
          }
        },
        audioVersions: {
          select: {
            id: true,
            versionType: true,
            fileName: true,
            filePath: true,
            isNormalized: true,
            lufsLevel: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    })

    console.log('Track found:', track ? 'Yes' : 'No')

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found in database' },
        { status: 404 }
      )
    }

    return NextResponse.json(track)

  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    )
  }
}