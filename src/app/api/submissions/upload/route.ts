import { NextRequest, NextResponse } from 'next/server';
import { saveSubmission, uploadSubmissionFile, getExams } from '@/lib/store';
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

    // Verify exam deadline
    const exams = await getExams();
    const exam = exams.find(e => e.id === examId);
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
    }
    if (exam.deadline && new Date(exam.deadline) < new Date()) {
      return NextResponse.json({ error: 'The deadline for this exam has passed. Submissions are closed.' }, { status: 403 });
    }

    const id = randomUUID();
    const safeName = `submission-${studentId}-${examId}-${Date.now()}.pdf`;
    
    // Read submission file data and upload to Supabase submissions bucket
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storagePath = await uploadSubmissionFile(safeName, buffer, file.type);

    // Save submission record to database
    await saveSubmission({
      id,
      examId,
      examTitle,
      studentName,
      studentId,
      fileName: safeName,
      filePath: storagePath,
      submittedAt: new Date().toISOString(),
      fileSize: bytes.byteLength,
    });

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
