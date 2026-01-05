import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';

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
      <body className="min-h-screen text-foreground bg-background font-sans antialiased">
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
        <script src="https://api.map.baidu.com/api?v=1.0&type=webgl&ak=omdCxGga1olQLcpbGMMs01W6A0VX9gWQ" />
      </body>
    </html>
  );
}
