import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Password required.' }, { status: 400 });
    if (checkAdminPassword(password)) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 hours
        path: '/',
      });
      return res;
    }
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
