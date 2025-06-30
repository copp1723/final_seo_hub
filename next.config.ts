import type { NextConfig } from 'next'
// @ts-ignore Sentry Webpack plugin is not typed.
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // We'll handle type errors during development
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  reactStrictMode: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Fix googleapis issue
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
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
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Chart.js chunk
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
        },
      }
    }
    
    return config
  },
  async headers() {
    return [
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
            // CSP needs to be updated to allow Sentry to report errors.
            // Add your Sentry DSN's host to connect-src.
            // e.g. if your DSN is https://xxxxxxxxxxxx@ooooo.ingest.sentry.io/12345,
            // then add https://ooooo.ingest.sentry.io to connect-src.
            // For now, I'll add a placeholder.
            // TODO: Update CSP with your Sentry DSN host.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://openrouter.ai https://www.googleapis.com YOUR_SENTRY_DSN_HOST_HERE", // TODO: Update this
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ],
      },
    ]
  },
  sentry: {
    // Suppress source map uploading logs during build
    silentClientLogger: true,
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
  },
}

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  org: "YOUR_SENTRY_ORG_SLUG_HERE", // TODO: Replace with your Sentry organization slug
  project: "YOUR_SENTRY_PROJECT_SLUG_HERE", // TODO: Replace with your Sentry project slug

  // An auth token is required for uploading source maps.
  // You can get an auth token from https://sentry.io/settings/account/api/auth-tokens/
  // and add it to your .env.local file as SENTRY_AUTH_TOKEN.
  // Alternatively, you can set it directly here.
  // authToken: process.env.SENTRY_AUTH_TOKEN, // Recommended: use .env.local

  silent: true, // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

// Make sure to pipe your Next.js config through withSentryConfig to enable source maps generation for Sentry.
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);