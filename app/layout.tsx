import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Our Days',
  description: 'Plans, meals, sleep, health and learning — for the two of us.',
  appleWebApp: { capable: true, title: 'Our Days', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#BE3A64', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
