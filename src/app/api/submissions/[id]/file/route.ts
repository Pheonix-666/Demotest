import { NextRequest, NextResponse } from 'next/server';
import { getSubmissions } from '@/lib/store';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subs = getSubmissions();
  const sub = subs.find(s => s.id === id);
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const absPath = path.join(process.cwd(), 'public', sub.filePath);
    const buf = await readFile(absPath);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sub.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
