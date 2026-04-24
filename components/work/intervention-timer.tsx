'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/time';

interface InterventionTimerProps {
  startedAt: string | null;
}

export function InterventionTimer({ startedAt }: InterventionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 60000));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return null;

  return (
    <div className="rounded-md bg-blue-50 px-4 py-3 text-center">
      <p className="text-xs text-blue-600">Durata attuale</p>
      <p className="text-3xl font-bold tabular-nums text-blue-800">{formatDuration(elapsed)}</p>
    </div>
  );
}
