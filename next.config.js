/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '10.6.26.79',
        port: '3000',
        pathname: '/*/**',
        search: ''
      }
    ]
  },
  // 将引起警告的库放入外部包列表
  serverExternalPackages: [
    'heic-convert',
    'heic-decode',
    'libheif-js',
    '@prisma/client',
    'prisma'
  ]
};

export default nextConfig;
