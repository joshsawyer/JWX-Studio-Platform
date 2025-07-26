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
  // IMPORTANT: params needs to be destructured from the second argument,
  // and it's already an object, not a Promise. The error message is a bit misleading
  // if it implies `params` itself is a Promise.
  // The issue is often with how Next.js handles dynamic segments in server components/routes.
  // However, the typical fix for "params should be awaited" in a route handler
  // is to ensure the handler is `async` and the `params` object is correctly typed
  // and accessed. The previous structure was correct for how Next.js passes dynamic params.
  // This specific error "params should be awaited before using its properties"
  // can sometimes be a red herring or related to an older Next.js version/specific setup.
  // Let's ensure the `params` object is directly used as it's passed.
  // The error message might be indicating a deeper issue with the Next.js runtime
  // or how the route is being compiled if `params` is indeed being treated as a Promise.
  // For now, let's keep the direct access as it's standard.
  // If the error persists, it might point to a Next.js version or build-time issue.
  { params }: { params: { path: string[] } }
) {
  try {
    // The 'path' parameter is an array of segments (e.g., ['projects', 'id1', 'id2', 'stereo.wav'])
    // No `await` is typically needed for `params` itself in App Router route handlers,
    // as it's passed as a direct object.
    const relativeFilePath = params.path.join(path.sep); // Reconstruct the relative path

    // Log the relative path received by the API
    console.log('API: Received relativeFilePath from URL params:', relativeFilePath);

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
