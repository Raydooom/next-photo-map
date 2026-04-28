/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 确保在生产环境中独立运行
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**'
      },
      {
        protocol: 'http',
        hostname: '10.168.1.5',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'sso.raydom.wang',
        pathname: '/**'
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
