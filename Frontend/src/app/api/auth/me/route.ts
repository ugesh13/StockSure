import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('stocksure_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ success: false, user: null }, { status: 200 });
    }

    const user = db.findUserById(sessionCookie);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || (user.email.toLowerCase() === 'admin@verdantnursery.com' ? 'admin' : 'customer'),
        createdAt: user.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ success: false, user: null }, { status: 200 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Signed out.' });
  response.cookies.delete('stocksure_session');
  return response;
}
