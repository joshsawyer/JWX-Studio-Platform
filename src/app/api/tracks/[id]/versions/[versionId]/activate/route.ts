import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const resolvedParams = await params
    const trackId = resolvedParams.id
    const versionId = resolvedParams.versionId

    // Get the version to activate
    const versionToActivate = await prisma.audioVersion.findUnique({
      where: { id: versionId }
    })

    if (!versionToActivate || versionToActivate.trackId !== trackId) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Deactivate all other versions of the same type
    await prisma.audioVersion.updateMany({
      where: {
        trackId: trackId,
        versionType: versionToActivate.versionType
      },
      data: {
        isActive: false
      }
    })

    // Activate the specified version
    const updatedVersion = await prisma.audioVersion.update({
      where: { id: versionId },
      data: { isActive: true }
    })

    return NextResponse.json(updatedVersion)
  } catch {
    console.error('Error activating version')
    return NextResponse.json(
      { error: 'Failed to activate version' },
      { status: 500 }
    )
  }
}