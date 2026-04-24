import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { addPhoto } from '@/lib/actions/interventions';
import { PhotoKind } from '@prisma/client';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      interventionId: number;
      url: string;
      publicId?: string;
      kind: PhotoKind;
    };
    await addPhoto(body.interventionId, body.url, body.kind, body.publicId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
