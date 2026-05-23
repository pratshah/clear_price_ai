import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClearPrice — Hospital Price Transparency',
  description: 'Find and compare real hospital prices before you need care.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
