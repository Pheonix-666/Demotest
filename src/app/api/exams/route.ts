import { NextRequest, NextResponse } from 'next/server';
import { getExams } from '@/lib/store';

export async function GET(_req: NextRequest) {
  try {
    const exams = getExams();
    return NextResponse.json({ exams });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
