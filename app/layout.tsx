import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { GlobalNavbar } from "@/components/global-navbar"
import { ToastContainer } from "@/components/toast"
import { NavigationLoader } from "@/components/navigation-loader"
import { SessionDebugger } from "@/components/session-debugger"
import { GlobalClickHandler } from "@/components/global-click-handler"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AstroTalk - Cosmic Conversations",
  description: "Connect with astrology, explore your cosmic destiny",
  icons: {
    icon: "/icon.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ff6f1e" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`font-sans antialiased overflow-x-hidden`} style={{ padding: 0, margin: 0 }}>
        <GlobalClickHandler />
        <NavigationLoader />
        {children}
        <GlobalNavbar />
        <ToastContainer />
        <SessionDebugger />
        <Analytics />
      </body>
    </html>
  )
}
