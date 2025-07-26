import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/middleware'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/aiff']

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const trackId = formData.get('trackId') as string
    const versionType = formData.get('versionType') as string

    // Validate inputs
    if (!file || !trackId || !versionType) {
      return NextResponse.json(
        { error: 'File, trackId, and versionType are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: WAV, MP3, FLAC, AIFF' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 500MB' },
        { status: 400 }
      )
    }

    // Validate version type
    if (!['STEREO', 'ATMOS', 'REFERENCE'].includes(versionType)) {
      return NextResponse.json(
        { error: 'Invalid version type' },
        { status: 400 }
      )
    }

    // Verify track exists and user has access
    const track = await prisma.track.findFirst({
      where: { 
        id: trackId,
        ...(user.role === 'CLIENT' ? { 
          project: { userId: user.id } 
        } : {})
      },
      include: {
        project: {
          select: { id: true, userId: true }
        }
      }
    })

    if (!track) {
      return NextResponse.json(
        { error: 'Track not found or access denied' },
        { status: 404 }
      )
    }

    // Create directory structure
    const projectId = track.project.id
    const uploadDir = path.join(process.cwd(), 'uploads', 'projects', projectId, trackId)
    
    try {
      await fs.mkdir(uploadDir, { recursive: true })
    } catch (error) {
      console.error('Error creating directory:', error)
    }

    // Generate filename
    const fileExtension = path.extname(file.name) || '.wav'
    const fileName = `${versionType.toLowerCase()}${fileExtension}`
    const filePath = path.join(uploadDir, fileName)
    const relativePath = `/uploads/projects/${projectId}/${trackId}/${fileName}`

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filePath, buffer)

    // Update or create audio version in database
    const existingVersion = await prisma.audioVersion.findFirst({
      where: {
        trackId,
        versionType: versionType as 'STEREO' | 'ATMOS' | 'REFERENCE'
      }
    })

    let audioVersion
    if (existingVersion) {
      // Update existing version
      audioVersion = await prisma.audioVersion.update({
        where: { id: existingVersion.id },
        data: {
          fileName,
          filePath: relativePath,
          fileSize: file.size,
          isNormalized: false // Reset normalization flag
        }
      })
    } else {
      // Create new version
      audioVersion = await prisma.audioVersion.create({
        data: {
          trackId,
          versionType: versionType as 'STEREO' | 'ATMOS' | 'REFERENCE',
          fileName,
          filePath: relativePath,
          fileSize: file.size,
          isNormalized: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      audioVersion,
      message: `${versionType} version uploaded successfully`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}