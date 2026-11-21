import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePathArray = params.path || [];
  const fileName = filePathArray.join('/');

  // Reject path traversal attempts
  if (filePathArray.some((seg) => seg === '..' || seg.includes('\\') || seg.includes('\0'))) {
    return new NextResponse('Bad request', { status: 400 });
  }

  // Potential candidate locations for the reference video
  const candidates = [
    path.join(process.cwd(), 'references', fileName),
    path.join(process.cwd(), 'reference', fileName),
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

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType =
    ({ '.mp4': 'video/mp4', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' } as Record<string, string>)[ext] ||
    'application/octet-stream';
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
        'Content-Type': contentType,
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
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
