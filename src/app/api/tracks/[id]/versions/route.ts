import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const trackId = id

    const versions = await prisma.audioVersion.findMany({
      where: {
        trackId: trackId
      },
      orderBy: [
        { versionType: 'asc' },
        { versionNumber: 'desc' }
      ]
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching track versions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch track versions' },
      { status: 500 }
    )
  }
}