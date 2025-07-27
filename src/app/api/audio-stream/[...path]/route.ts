// src/app/api/audio-stream/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// Define the base directory where your audio files are stored.
// This path is now explicitly set based on your provided absolute path.
// It should point to the 'uploads' directory within your project.
const AUDIO_FILES_BASE_DIR = '/Users/joshsawyer/Documents/GitHub/JWX-Studio-Platform/uploads';

export async function GET(
  req: NextRequest,
  // Keep params in the signature for type inference, but we'll try to get path differently
  { params }: { params: { path: string[] } }
) {
  try {
    // Attempt to get the path segments directly from req.nextUrl.pathname
    // This bypasses the 'params' object which seems to be causing issues.
    // The pathname will be something like '/api/audio-stream/projects/id/file.wav'
    const fullApiPath = req.nextUrl.pathname;
    
    // Extract the part after '/api/audio-stream/'
    const apiPrefix = '/api/audio-stream/';
    let relativeFilePath: string;

    if (fullApiPath.startsWith(apiPrefix)) {
      relativeFilePath = fullApiPath.substring(apiPrefix.length);
    } else {
      console.error('API: Pathname does not start with expected prefix:', fullApiPath);
      return new NextResponse('Invalid API path structure.', { status: 400 });
    }

    // Decode URI components in case there are special characters in filenames
    relativeFilePath = decodeURIComponent(relativeFilePath);

    // Log the relative path derived from pathname
    console.log('API (from pathname): Derived relativeFilePath:', relativeFilePath);

    // Construct the full absolute path to the audio file
    const absoluteFilePath = path.join(AUDIO_FILES_BASE_DIR, relativeFilePath);

    // Log the full absolute path the API is trying to access
    console.log('API: Attempting to access absoluteFilePath:', absoluteFilePath);

    // Check if the file exists
    try {
      await fs.access(absoluteFilePath);
    } catch (error) {
      console.error(`API: File not found at ${absoluteFilePath}. Error:`, error);
      return new NextResponse('Audio file not found.', { status: 404 });
    }

    // Read the file content
    const fileBuffer = await fs.readFile(absoluteFilePath);

    // Determine the content type based on the file extension
    const ext = path.extname(absoluteFilePath).toLowerCase();
    let contentType = 'application/octet-stream'; // Default
    switch (ext) {
      case '.mp3':
        contentType = 'audio/mpeg';
        break;
      case '.wav':
        contentType = 'audio/wav';
        break;
      case '.ogg':
        contentType = 'audio/ogg';
        break;
      case '.flac':
        contentType = 'audio/flac';
        break;
      // Add more audio types as needed
    }

    // Return the file as a response
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        // Optional: Set Content-Disposition if you want the browser to download instead of play
        // 'Content-Disposition': `attachment; filename="${path.basename(absoluteFilePath)}"`,
      },
    });
  } catch (error) {
    console.error('API: Error serving audio file:', error);
    return new NextResponse('Internal Server Error.', { status: 500 });
  }
}
