import { NextRequest, NextResponse } from 'next/server';
import { saveSubmission, uploadSubmissionFile } from '@/lib/store';
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
