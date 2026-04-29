import { NextRequest, NextResponse } from 'next/server';
import { cancelExport } from '@/lib/actions/sageExport';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    const body = await req.json().catch(() => ({}));
    await cancelExport(batchId, (body as { reason?: string }).reason);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
