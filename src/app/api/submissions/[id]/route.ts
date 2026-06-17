import { NextRequest, NextResponse } from 'next/server';
import { getSubmissions, deleteSubmission } from '@/lib/store';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subs = getSubmissions();
  const sub = subs.find(s => s.id === id);
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const absPath = path.join(process.cwd(), 'public', sub.filePath);
    await unlink(absPath);
  } catch {}
  deleteSubmission(id);
  return NextResponse.json({ success: true });
}
