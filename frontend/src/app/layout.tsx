import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { TierProvider } from '@/lib/tier-context'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'
const inter = Inter({ subsets: ['latin'] })
export const metadata: Metadata = {
  title: 'Career Sage',
  description: 'AI-powered career intelligence platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Career Sage',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}
export const viewport: Viewport = {
  themeColor: '#10B981',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <body className={inter.className} style={{ background: '#0d1117', color: '#ffffff', minHeight: '100vh' }}>
        <ServiceWorkerRegistration />
        <TierProvider>
          {children}
        </TierProvider>
      </body>
    </html>
  )
}