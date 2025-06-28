import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We'll handle type errors during development
    ignoreBuildErrors: false,
  },
}

export default nextConfig