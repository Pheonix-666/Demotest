import { NextRequest, NextResponse } from 'next/server';
import { getSubmissions, deleteSubmission, deleteSubmissionFile } from '@/lib/store';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const subs = await getSubmissions();
    const sub = subs.find(s => s.id === id);
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Delete file from Supabase storage
    try {
      if (sub.filePath) {
        await deleteSubmissionFile(sub.filePath);
      }
    } catch (err) {
      console.error('Error deleting submission file from storage:', err);
    }

    // Delete record from database
    const deleted = await deleteSubmission(id);
    if (!deleted) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
