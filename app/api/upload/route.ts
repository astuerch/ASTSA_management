import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') as string | null) ?? 'astsa/interventions';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadImage(buffer, folder);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Errore durante il caricamento' }, { status: 500 });
  }
}
