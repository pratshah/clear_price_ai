import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
    NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL: process.env.NEXT_PUBLIC_ATLAS_CHARTS_BASE_URL ?? '',
    NEXT_PUBLIC_CHART_PRICE_HISTOGRAM_ID: process.env.NEXT_PUBLIC_CHART_PRICE_HISTOGRAM_ID ?? '',
    NEXT_PUBLIC_CHART_PAYER_BREAKDOWN_ID: process.env.NEXT_PUBLIC_CHART_PAYER_BREAKDOWN_ID ?? '',
    NEXT_PUBLIC_CHART_PRICE_TREND_ID: process.env.NEXT_PUBLIC_CHART_PRICE_TREND_ID ?? '',
    NEXT_PUBLIC_ATLAS_DASHBOARD_ID: process.env.NEXT_PUBLIC_ATLAS_DASHBOARD_ID ?? '',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' https://charts.mongodb.com;",
          },
        ],
      },
    ]
  },
}
export default nextConfig
