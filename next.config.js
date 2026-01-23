/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '10.6.23.147',
        port: '3000',
        pathname: '/*/**',
        search: ''
      }
    ]
  }
};

module.exports = nextConfig;
