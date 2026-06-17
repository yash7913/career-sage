import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TierProvider } from '@/lib/tier-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Career Sage',
  description: 'AI-powered career intelligence platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <body className={inter.className} style={{ background: '#0d1117', color: '#ffffff', minHeight: '100vh' }}>
        <TierProvider>
          {children}
        </TierProvider>
      </body>
    </html>
  )
}