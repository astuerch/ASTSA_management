import { NextRequest, NextResponse } from 'next/server';
import { updateAccountingConfig } from '@/lib/actions/sageExport';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;
    const { value } = await req.json();
    await updateAccountingConfig(key, value);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
