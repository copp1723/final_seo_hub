const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns']
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Fix googleapis issue
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false
      }
    }
    
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](?!googleapis)/,
            priority: 20
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          },
          // Chart.js chunk
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            chunks: 'all',
            priority: 30
          }
        }
      }
    }
    
    return config
  },
  async headers() {
    return [
      {
        // Headers for static assets
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Headers specifically for CSS files
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.onrender.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://openrouter.ai https://www.googleapis.com https://accounts.google.com https://*.google.com https://*.onrender.com ws://localhost:* wss://localhost:* wss://*.onrender.com",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "worker-src 'self' blob:"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: true,

  // Routes browser requests to an internal Sentry proxy API route
  tunnelRoute: '/api/monitoring/sentry',

  // Hides source maps from tree-shaking by Next.js in production builds
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Automatically instrument your Next.js server calls with Sentry
  autoInstrumentServerFunctions: true,

  // Automatically instrument your Next.js client-side navigation with Sentry
  autoInstrumentClientFunctions: true,
}); 