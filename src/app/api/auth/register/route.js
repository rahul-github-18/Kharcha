import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/db';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const user = await registerUser(username, password);
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 400 });
  }
}
