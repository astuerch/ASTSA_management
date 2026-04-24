import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import './globals.css';

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ASTSA Management',
  description: 'Gestionale operativo ASTSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={jost.variable}>
      <body className="bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  );
}
