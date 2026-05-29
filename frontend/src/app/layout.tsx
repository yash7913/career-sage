import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TierProvider } from '@/lib/tier-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Career Sage',
  description: 'AI-powered job search command center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TierProvider>
          {children}
        </TierProvider>
      </body>
    </html>
  )
}