import { NextRequest, NextResponse } from 'next/server';
import { generateExport } from '@/lib/actions/sageExport';

export async function POST(req: NextRequest) {
  try {
    const { invoiceIds } = await req.json();
    const result = await generateExport(invoiceIds);
    const zipBuffer = result.zipBuffer;
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="sage-export-${result.batchNumber}.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
