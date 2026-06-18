import { NextRequest, NextResponse } from 'next/server';
import { getSubmissions, downloadSubmissionFile } from '@/lib/store';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const subs = await getSubmissions();
    const sub = subs.find(s => s.id === id);
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Download file from Supabase storage
    const buf = await downloadSubmissionFile(sub.filePath);
    
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sub.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Error serving submission file:', err);
    return NextResponse.json({ error: 'File not found or error downloading' }, { status: 404 });
  }
}
