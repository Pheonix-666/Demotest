import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = req.cookies.get('admin_session');
  return NextResponse.json({ ok: session?.value === 'authenticated' });
}
