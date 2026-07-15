import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Feature Flags',
  description: 'Multi-tenant feature flag management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="app-header-inner">
            <Link href="/" className="brand">
              Feature<span>Flags</span>
            </Link>
            <span className="brand-sub">multi-tenant control</span>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
