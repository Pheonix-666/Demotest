import { NextRequest, NextResponse } from 'next/server';
import { getExams, downloadExamFile } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exams = await getExams();
    const exam = exams.find(e => e.id === id);
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Download file from Supabase storage
    const buf = await downloadExamFile(exam.filePath);
    
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${exam.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Error serving exam file:', err);
    return NextResponse.json({ error: 'File not found or error downloading' }, { status: 404 });
  }
}
