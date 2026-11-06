/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
      'scontent.cdninstagram.com',
      'instagram.com',
      'api71.unipile.com',
    ],
  },
};

module.exports = nextConfig;
