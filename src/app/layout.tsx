import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { Providers } from './providers';

import { siteConfig } from '@/config/site';
import { LayoutWrapper } from '@/components/layout-wrapper';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`
  },
  description: siteConfig.description,
  icons: {
    icon: '/favicon.ico'
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="zh-CN">
      <head />
      <body className="min-h-screen text-main bg-page-background font-sans antialiased">
        <svg width="0" height="0">
          <defs>
            <mask id="myMask" maskUnits="objectBoundingBox">
              <rect width="1" height="1" fill="white" />
              <path d="M 0.8 1 L 1 1 L 1 0.8 Q 0.9 0.9 0.8 1 Z" fill="black" />
            </mask>
          </defs>
        </svg>
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
