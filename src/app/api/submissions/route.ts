import { NextRequest, NextResponse } from 'next/server';
import { getSubmissions } from '@/lib/store';

export async function GET(_req: NextRequest) {
  try {
    const submissions = getSubmissions();
    return NextResponse.json({ submissions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
