import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Anton, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';

const anton = Anton({
  variable: '--font-anton',
  subsets: ['latin'],
  weight: '400',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Saber',
  description: 'Drop your track list. See what you played.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${anton.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
