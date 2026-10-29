import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Gemini連携 リアルタイムTODO管理アプリ',
  description:
    'Gemini 1.5 Flashの構造化出力を活用した、ステートレスかつ高再現性な次世代リアルタイムTODO管理アプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`dark ${inter.variable}`}>
      <body className="min-h-screen text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
        {children}
      </body>
    </html>
  );
}
