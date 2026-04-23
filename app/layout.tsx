import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASTSA Management',
  description: 'Gestionale operativo ASTSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
