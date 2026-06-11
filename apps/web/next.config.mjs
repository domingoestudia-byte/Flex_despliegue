/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
