import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'

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
        comments: {
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

// DELETE /api/tracks/[id] - Remove a track and its audio files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Find the track and its audio versions
    const track = await prisma.track.findUnique({
      where: { id },
      include: {
        project: { select: { id: true } },
        audioVersions: true
      }
    });
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }
    // Delete audio files from disk
    const projectId = track.project.id;
    const uploadDir = path.join(process.cwd(), 'uploads', 'projects', projectId, id);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch (err) {
      // Log but don't fail if files are missing
      console.error('Error deleting files:', err);
    }
    // Delete audioVersions and track from DB (cascade should handle audioVersions if set)
    await prisma.track.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting track:', error);
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 });
  }
}