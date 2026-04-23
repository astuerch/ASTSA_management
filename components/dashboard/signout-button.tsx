'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <Button type="button" className="bg-slate-200 text-slate-800 hover:bg-slate-300" onClick={() => signOut({ callbackUrl: '/login' })}>
      Logout
    </Button>
  );
}
