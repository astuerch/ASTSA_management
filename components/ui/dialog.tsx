import * as React from 'react';
import { cn } from '@/lib/utils';

export function Dialog({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-white p-4', className)} {...props} />;
}
