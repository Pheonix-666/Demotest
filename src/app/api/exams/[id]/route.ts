import { NextRequest, NextResponse } from 'next/server';
import { getExams, updateExam, deleteExam } from '@/lib/store';
import { unlink } from 'fs/promises';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exams = getExams();
  const exam = exams.find(e => e.id === id);
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ exam });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateExam(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exams = getExams();
  const exam = exams.find(e => e.id === id);
  if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Delete file
  try {
    const absPath = path.join(process.cwd(), 'public', exam.filePath);
    await unlink(absPath);
  } catch {}
  deleteExam(id);
  return NextResponse.json({ success: true });
}
