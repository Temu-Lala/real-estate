import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import Script from 'next/script'
import { BRAND } from '@/lib/site-contact'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Platinum Properties | Premium Addis Ababa Real Estate',
  description:
    'Platinum Properties helps you buy, rent and invest in exceptional homes across Bole, Kazanchis, CMC and all of Addis Ababa, Ethiopia. Verified listings, honest guidance, personal service.',
  generator: 'v0.app',
  keywords: 'real estate, Addis Ababa, Ethiopia, properties for sale, houses for rent, luxury homes, apartments, land, commercial property',
  authors: [{ name: 'Platinum Marketing Services PLC' }],
  // Tab, bookmark and homescreen icons: the house mark from the brand logo, cut to a
  // square tile. iOS composites transparent homescreen art on black, so the tiles are
  // pre-baked on the navy plate — see the BRAND constants in lib/site-contact.ts.
  icons: {
    icon: [{ url: BRAND.iconSrc, type: 'image/png', sizes: '32x32' }],
    apple: [{ url: BRAND.appleIconSrc, type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://platinumpropertieset.com',
    siteName: 'Platinum Properties',
    title: 'Platinum Properties | Premium Addis Ababa Real Estate',
    description: 'Buy, rent and invest in exceptional homes across Addis Ababa, Ethiopia',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Platinum Properties | Premium Addis Ababa Real Estate',
    description: 'Buy, rent and invest in exceptional homes across Addis Ababa, Ethiopia',
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
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />

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
        {/* Google Tag Manager - only in production */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtm.js?id=GTM-MLHZ54MJ"
              strategy="afterInteractive"
            />
            <Script id="google-tag-manager" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
              `}
            </Script>
          </>
        )}

        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
