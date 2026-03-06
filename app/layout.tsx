import type {Metadata, Viewport} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'DevReLive',
  description: 'Live AI Code repairs, direct Dev support for builds, code and apps.',
  metadataBase: new URL('https://devrelive.vercel.app'),
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'DevReLive',
    description: 'Live AI Code repairs, direct Dev support for builds, code and apps.',
    url: 'https://devrelive.vercel.app',
    siteName: 'DevReLive',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'DevReLive',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevReLive',
    description: 'Live AI Code repairs, direct Dev support for builds, code and apps.',
    images: ['/og.png'],
  },
  other: {
    'base:app_id': '69aaae3f3c6755b23e8e4138',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://devrelive.vercel.app/og.png',
      button: {
        title: 'Launch App',
        action: {
          type: 'launch_miniapp',
          name: 'DevReLive',
          url: 'https://devrelive.vercel.app',
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased text-white bg-black">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
