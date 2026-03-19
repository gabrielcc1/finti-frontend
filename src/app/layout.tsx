// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono' })

export const metadata: Metadata = {
  title: 'Finti — ERP para emprendedores',
  description: 'Gestioná ventas, cobranzas, stock y pedidos de tu negocio desde el celular',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finti',
    startupImage: [
      { url: '/splash/splash-640x1136.png',   media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-750x1334.png',   media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-828x1792.png',   media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-1125x2436.png',  media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1242x2688.png',  media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1170x2532.png',  media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-1284x2778.png',  media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' },
      { url: '/splash/splash-2048x2732.png',  media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)' },
      { url: '/splash/splash-1668x2388.png',  media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)' },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#141210',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf8' },
    { media: '(prefers-color-scheme: dark)',  color: '#141210' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

const themeScript = `(function(){try{
  var s=localStorage.getItem('finti_dark_mode');
  var p=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var d=s!==null?s==='true':p;
  if(d) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#141210';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.backgroundColor = '#fafaf8';
  }
}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${dmSans.variable} ${dmMono.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}