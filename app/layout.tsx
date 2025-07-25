import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { SelectedDealershipProvider } from './context/SelectedDealershipContext'
import { generateMetadata as generateBrandingMetadata } from '@/lib/branding/metadata'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = generateBrandingMetadata()

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <SelectedDealershipProvider>
            {children}
          </SelectedDealershipProvider>
        </Providers>
      </body>
    </html>
  )
}
