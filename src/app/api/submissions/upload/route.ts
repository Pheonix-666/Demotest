import { NextRequest, NextResponse } from 'next/server';
import { saveSubmission } from '@/lib/store';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const examId = formData.get('examId') as string;
    const examTitle = formData.get('examTitle') as string;
    const studentName = formData.get('studentName') as string;
    const studentId = formData.get('studentId') as string;

    if (!file || !examId || !studentName || !studentId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const id = randomUUID();
    const safeName = `submission-${studentId}-${examId}-${Date.now()}.pdf`;
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'submissions');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    saveSubmission({
      id,
      examId,
      examTitle,
      studentName,
      studentId,
      fileName: safeName,
      filePath: `/uploads/submissions/${safeName}`,
      submittedAt: new Date().toISOString(),
      fileSize: bytes.byteLength,
    });

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
