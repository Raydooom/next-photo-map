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
  }
};

module.exports = nextConfig;
