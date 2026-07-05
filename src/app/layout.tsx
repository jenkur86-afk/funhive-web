import type { Metadata } from 'next'
import Header from '@/components/Header'
import SuggestButton from '@/components/SuggestButton'
import { AuthProvider } from '@/contexts/AuthContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const SITE_URL = 'https://myfunhive.com'

export const metadata: Metadata = {
  title: 'FunHive - Family Events & Activities Near You',
  description: 'Discover family-friendly events, activities, and things to do with kids in your area. Free and paid events from 100+ local sources.',
  keywords: 'family events, kids activities, things to do with kids, family fun, local events',
  openGraph: {
    title: 'FunHive - Family Events & Activities Near You',
    description: 'Discover family-friendly events, activities, and things to do with kids in your area. Free and paid events from 100+ local sources.',
    url: SITE_URL,
    siteName: 'FunHive',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FunHive - Family Events & Activities Near You',
    description: 'Discover family-friendly events, activities, and things to do with kids in your area.',
  },
  metadataBase: new URL(SITE_URL),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FavoritesProvider>
            <Header />
            <main id="main-content">
              {children}
            </main>
            <SuggestButton />
            <Analytics />
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
