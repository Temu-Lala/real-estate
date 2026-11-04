import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { BRAND } from '@/lib/site-contact'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Platinum Properties | Premium Addis Ababa Real Estate',
  description:
    'Platinum Properties helps you buy, rent and invest in exceptional homes across Bole, Kazanchis, CMC and all of Addis Ababa, Ethiopia. Verified listings, honest guidance, personal service.',
  generator: 'v0.app',
  // Tab, bookmark and homescreen icons: the house mark from the brand logo, cut to a
  // square tile. iOS composites transparent homescreen art on black, so the tiles are
  // pre-baked on the navy plate — see the BRAND constants in lib/site-contact.ts.
  icons: {
    icon: [{ url: BRAND.iconSrc, type: 'image/png', sizes: '32x32' }],
    apple: [{ url: BRAND.appleIconSrc, type: 'image/png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  // Light is the site default, so the tag ships light; ThemeToggle rewrites it to
  // the dark hue as soon as a visitor switches, keeping the browser chrome in step.
  themeColor: '#f5f3ee',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash of the wrong colors.
            Light is the default: <html> is left untouched (the :root palette in
            globals.css) unless this visitor explicitly chose dark earlier. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('haven_theme')==='dark'){document.documentElement.dataset.theme='dark'}}catch(e){}",
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
