import Link from 'next/link';

export default function SageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 border-b pb-2">
        <Link href="/dashboard/sage/exports" className="text-sm font-medium text-blue-600 hover:underline">
          Export batch
        </Link>
        <Link href="/dashboard/sage/config" className="text-sm font-medium text-blue-600 hover:underline">
          Configurazione contabile
        </Link>
      </div>
      {children}
    </div>
  );
}
