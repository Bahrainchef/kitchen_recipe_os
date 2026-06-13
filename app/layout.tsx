import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK', 'opsz'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kitchen Recipe OS | BahrainChef',
  description: 'Multi-venue recipe management for Bahrain and Saudi Arabia F&B group',
  icons: {
    icon: '/Favicon_Kitchen_recipe_os.png',
    apple: '/Favicon_Kitchen_recipe_os.png',
    shortcut: '/Favicon_Kitchen_recipe_os.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 0.8,
  maximumScale: 2,
  themeColor: '#0B1F4A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/Favicon_Kitchen_recipe_os.png" type="image/png" />
        <link rel="shortcut icon" href="/Favicon_Kitchen_recipe_os.png" />
        <link rel="apple-touch-icon" href="/Favicon_Kitchen_recipe_os.png" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-canvas text-text-primary">
        {children}
      </body>
    </html>
  )
}
