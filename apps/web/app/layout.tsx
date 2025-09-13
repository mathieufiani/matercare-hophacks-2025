import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  title: "MaterCare - Your Maternal Wellness Hub",
  description:
    "Supportive AI-powered wellness companion for expectant and new mothers. Get personalized guidance, mood tracking, and crisis support.",
  keywords: ["maternal health", "pregnancy support", "postpartum care", "mental wellness", "AI companion"],
  authors: [{ name: "MaterCare Team" }],
  creator: "MaterCare",
  publisher: "MaterCare",
  robots: "index, follow",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // themeColor must live here in Next 15+
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b23" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} antialiased`}>
        <Suspense fallback={<div>Loading...</div>}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="aurora-bg floating-particles">{children}</div>
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}