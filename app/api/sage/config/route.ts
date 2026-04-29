import { NextResponse } from 'next/server';
import { listAccountingConfigs } from '@/lib/actions/sageExport';

export async function GET() {
  try {
    const configs = await listAccountingConfigs();
    return NextResponse.json(configs);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
