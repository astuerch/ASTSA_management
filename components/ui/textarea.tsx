import * as React from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('min-h-[80px] w-full rounded-md border border-slate-200 px-3 py-2 text-sm', className)} {...props} />;
}
