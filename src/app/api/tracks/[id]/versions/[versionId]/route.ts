import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const resolvedParams = await params
    const trackId = resolvedParams.id
    const versionId = resolvedParams.versionId

    // Get the version to delete
    const versionToDelete = await prisma.audioVersion.findUnique({
      where: { id: versionId }
    })

    if (!versionToDelete || versionToDelete.trackId !== trackId) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Check if this is the only version of this type
    const sameTypeVersions = await prisma.audioVersion.findMany({
      where: {
        trackId: trackId,
        versionType: versionToDelete.versionType
      }
    })

    if (sameTypeVersions.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only version of this type' },
        { status: 400 }
      )
    }

    // Delete associated comments first
    await prisma.comment.deleteMany({
      where: {
        audioVersionId: versionId
      }
    })

    // Delete the audio version record
    await prisma.audioVersion.delete({
      where: { id: versionId }
    })

    // Delete the physical file
    try {
      const fullPath = path.join(process.cwd(), versionToDelete.filePath.replace(/^\//, ''))
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue even if file deletion fails
    }

    // If the deleted version was active, make the latest version of the same type active
    if (versionToDelete.isActive) {
      const latestVersion = await prisma.audioVersion.findFirst({
        where: {
          trackId: trackId,
          versionType: versionToDelete.versionType
        },
        orderBy: {
          versionNumber: 'desc'
        }
      })

      if (latestVersion) {
        await prisma.audioVersion.update({
          where: { id: latestVersion.id },
          data: { isActive: true }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error('Error deleting version')
    return NextResponse.json(
      { error: 'Failed to delete version' },
      { status: 500 }
    )
  }
}