/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: "lh3.googleusercontent.com", // Google's specific avatar host
      },
      {
        protocol: 'https',
        hostname: "avatars.githubusercontent.com", // Add this for GitHub avatars
      },
      {
        protocol: 'https',
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      {
        protocol: 'https',
        hostname: "cdn.openai.com",
      },
    ],
  },
};

module.exports = nextConfig;