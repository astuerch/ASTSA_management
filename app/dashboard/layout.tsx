import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getSidebarItemsForRole } from '@/lib/sidebar';
import { SignOutButton } from '@/components/dashboard/signout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return null;

  const items = getSidebarItemsForRole(session.user.role as 'DIPENDENTE' | 'CAPOSQUADRA' | 'AMMINISTRAZIONE' | 'DIREZIONE');

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">ASTSA</h2>
        <nav className="space-y-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-2 py-1 text-sm hover:bg-slate-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-white px-6 py-3">
          <p className="text-sm text-slate-700">{session.user.name}</p>
          <SignOutButton />
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
