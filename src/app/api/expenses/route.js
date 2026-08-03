import { NextResponse } from 'next/server';
import { getExpenses, addExpense } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || '';
    const expenses = await getExpenses(username);
    return NextResponse.json(expenses);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { amount, reason, username } = await request.json();
    const record = await addExpense(amount, reason, username);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to save expense' }, { status: 400 });
  }
}
