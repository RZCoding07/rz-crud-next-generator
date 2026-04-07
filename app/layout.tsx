import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'RZCoding CRUD App',
  description: 'Created with love by RZCOding',
  icons: {
    icon: [
      {
        url: '/rz.jpeg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/rz.jpeg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/rz.jpeg',
      
      },
    ],
    apple: '/rz.jpeg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
