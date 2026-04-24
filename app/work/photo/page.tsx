import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PhotoClient } from '@/components/work/photo-client';

export default async function PhotoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');

  const interventionId = params.id ? parseInt(params.id, 10) : null;
  if (!interventionId) redirect('/work');

  return <PhotoClient interventionId={interventionId} />;
}
