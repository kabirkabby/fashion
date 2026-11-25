import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AkoyaProvider } from '@/context/AkoyaContext';
import { AkoyaShell } from '@/components/layout/AkoyaShell';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Akoya Studio — Clothing Brand Operating System',
  description:
    'Manage manufacturers, fabric & trim suppliers, SKU collections, smart inventory reorders, reminders, calendar timelines, and your brand team.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F3F2EE] text-[#1B1A18] selection:bg-[#F7D147]/40">
        <AkoyaProvider>
          <AkoyaShell>{children}</AkoyaShell>
        </AkoyaProvider>
      </body>
    </html>
  );
}
