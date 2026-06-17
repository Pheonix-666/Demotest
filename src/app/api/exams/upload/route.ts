import { NextRequest, NextResponse } from 'next/server';
import { saveExam } from '@/lib/store';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export const config = { api: { bodyParser: false } };

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
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'exams');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    saveExam({
      id,
      title,
      description,
      fileName: file.name,
      filePath: `/uploads/exams/${fileName}`,
      uploadedAt: new Date().toISOString(),
      deadline: deadline || undefined,
      isActive: true,
    });

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
