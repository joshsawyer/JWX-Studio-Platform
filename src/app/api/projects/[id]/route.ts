import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Deleting project with ID:', id)

    // First, get the project with all related data to clean up files
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tracks: {
          include: {
            audioVersions: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete all audio files from filesystem
    for (const track of project.tracks) {
      for (const version of track.audioVersions) {
        try {
          if (fs.existsSync(version.filePath)) {
            fs.unlinkSync(version.filePath)
            console.log('Deleted file:', version.filePath)
          }
        } catch (fileError) {
          console.warn('Failed to delete file:', version.filePath, fileError)
        }
      }
    }

    // Delete project directory if it exists
    const projectDir = path.join(process.cwd(), 'uploads', 'projects', id)
    if (fs.existsSync(projectDir)) {
      try {
        fs.rmSync(projectDir, { recursive: true, force: true })
        console.log('Deleted project directory:', projectDir)
      } catch (dirError) {
        console.warn('Failed to delete project directory:', projectDir, dirError)
      }
    }

    // Delete from database (cascade will handle related records)
    await prisma.project.delete({
      where: { id }
    })

    console.log('Project deleted successfully:', id)

    return NextResponse.json({ 
      message: 'Project deleted successfully',
      projectId: id 
    })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}