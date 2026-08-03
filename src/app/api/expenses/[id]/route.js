import { NextResponse } from 'next/server';
import { deleteExpense } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
