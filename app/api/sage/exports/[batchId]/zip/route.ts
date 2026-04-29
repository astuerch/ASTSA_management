import { NextRequest, NextResponse } from 'next/server';
import { regenerateZip } from '@/lib/actions/sageExport';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    const { zipBuffer } = await regenerateZip(batchId);
    const batch = await prisma.sageExport.findUniqueOrThrow({ where: { id: batchId } });
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="sage-export-${batch.batchNumber}.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
