import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';

import { Providers } from './providers';

import { siteConfig } from '@/config/site';
import { LayoutWrapper } from '@/components/layout-wrapper';
import Script from 'next/script'

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
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
        {process.env.NODE_ENV}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="baidu-analytics"
            strategy="afterInteractive"
          >
            {`
              var _hmt = _hmt || [];
              (function() {
                var hm = document.createElement("script");
                hm.src = "https://hm.baidu.com/hm.js?8daef648d5e0c72de05079c54836ac1e";
                var s = document.getElementsByTagName("script")[0]; 
                s.parentNode.insertBefore(hm, s);
              })();
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
