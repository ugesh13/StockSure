import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePathArray = params.path || [];
  const fileName = filePathArray.join('/');

  // Potential candidate locations for the reference video
  const candidates = [
    path.join(process.cwd(), 'references', fileName),
    path.join(process.cwd(), 'reference', fileName),
    path.join('/Users/SHADOW/Desktop/Verdant/references', fileName),
    path.join('/Users/SHADOW/Desktop/Verdant/reference', fileName),
    path.join('/Users/SHADOW/Desktop/Verdant/references', 'Nursery_shop.mp4'),
    path.join('/Users/SHADOW/Desktop/Verdant/references', 'nursery_shop.mp4'),
    path.join('/Users/SHADOW/Verdant/references', fileName),
    path.join('/Users/SHADOW/Verdant/reference', fileName),
  ];

  let resolvedPath = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  // If filename case doesn't match, check case-insensitively
  if (!resolvedPath && filePathArray.length > 0) {
    const targetBase = filePathArray[filePathArray.length - 1].toLowerCase();
    const searchDirs = [
      path.join(process.cwd(), 'references'),
      path.join(process.cwd(), 'reference'),
      '/Users/SHADOW/Desktop/Verdant/references',
      '/Users/SHADOW/Desktop/Verdant/reference',
      '/Users/SHADOW/Verdant/references',
      '/Users/SHADOW/Verdant/reference',
    ];
    for (const dir of searchDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const match = files.find((f) => f.toLowerCase() === targetBase);
          if (match) {
            resolvedPath = path.join(dir, match);
            break;
          }
        }
      } catch {
        // continue
      }
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return new NextResponse('Asset not found', { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const fileStream = fs.createReadStream(resolvedPath, { start, end });
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const fileStream = fs.createReadStream(resolvedPath);
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
