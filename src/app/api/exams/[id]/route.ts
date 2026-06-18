import { NextRequest, NextResponse } from 'next/server';
import { getExams, updateExam, deleteExam, deleteExamFile } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exams = await getExams();
    const exam = exams.find(e => e.id === id);
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ exam });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateExam(id, body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exams = await getExams();
    const exam = exams.find(e => e.id === id);
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Delete file from Supabase storage
    try {
      if (exam.filePath) {
        await deleteExamFile(exam.filePath);
      }
    } catch (err) {
      console.error('Error deleting exam file from storage:', err);
    }

    // Delete record from database
    const deleted = await deleteExam(id);
    if (!deleted) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
