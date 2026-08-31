import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OmniCMS | Multi-Tenant Site & PBN Manager',
  description: 'Manage tenant sites and PBN links seamlessly with OmniCMS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: '100%', margin: 0 }}>
      <body className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
        {children}
      </body>
    </html>
  );
}
