import { NextResponse } from 'next/server';
import { importExpenses } from '@/lib/db';

export async function POST(request) {
  try {
    const { items, username } = await request.json();
    await importExpenses(items, username);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
