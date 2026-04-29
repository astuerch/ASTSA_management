import { NextRequest, NextResponse } from 'next/server';
import { confirmSageImport } from '@/lib/actions/sageExport';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    await confirmSageImport(batchId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
