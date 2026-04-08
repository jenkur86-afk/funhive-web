import type { Metadata } from 'next'
import Header from '@/components/Header'
import { AuthProvider } from '@/contexts/AuthContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'FunHive - Family Events & Activities Near You',
  description: 'Discover family-friendly events, activities, and things to do with kids in your area. Free and paid events from 100+ local sources.',
  keywords: 'family events, kids activities, things to do with kids, family fun, local events',
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
            {children}
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
