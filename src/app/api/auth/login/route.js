import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/db';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const user = await loginUser(username, password);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 401 });
  }
}
