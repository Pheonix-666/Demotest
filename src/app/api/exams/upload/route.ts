import { NextRequest, NextResponse } from 'next/server';
import { saveExam, uploadExamFile } from '@/lib/store';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const deadline = formData.get('deadline') as string || '';

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required.' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    const id = randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${id}-${safeName}`;
    
    // Read file data and upload to Supabase storage bucket
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const storagePath = await uploadExamFile(fileName, buffer, file.type);

    // Save exam record to Supabase database
    await saveExam({
      id,
      title,
      description,
      fileName: file.name,
      filePath: storagePath,
      uploadedAt: new Date().toISOString(),
      deadline: deadline || undefined,
      isActive: true,
    });

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
