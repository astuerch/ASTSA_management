import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { getSidebarItemsForRole } from '@/lib/sidebar';
import { SignOutButton } from '@/components/dashboard/signout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return null;

  const items = getSidebarItemsForRole(session.user.role as 'DIPENDENTE' | 'CAPOSQUADRA' | 'AMMINISTRAZIONE' | 'DIREZIONE');

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-dark text-white p-4 flex flex-col">
        <div className="mb-6 px-2">
          <Image src="/branding/logo-short.svg" alt="ASTSA" width={48} height={48} className="mb-2" />
          <span className="text-gold font-semibold text-sm tracking-widest">ASTSA</span>
        </div>
        <nav className="space-y-1 flex-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-gold transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-dark px-6 py-3">
          <Image src="/branding/logo-long.svg" alt="ASTSA Management" width={160} height={32} />
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-400">{session.user.name}</p>
            <SignOutButton />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
