"use client"

import type React from "react"
import { useState } from "react"
import { FooterNav } from "@/components/FooterNav"
import { NotAdviceBanner } from "@/components/NotAdviceBanner"
import { CrisisBanner } from "@/components/CrisisBanner"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

export default function ClientAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showCrisisBanner, setShowCrisisBanner] = useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background flex flex-col relative">
        {/* Crisis Banner - appears at top when risk level is high */}
        {showCrisisBanner && <CrisisBanner onDismiss={() => setShowCrisisBanner(false)} />}

        {/* Not Medical Advice Banner */}
        <NotAdviceBanner />

        {/* Main Content */}
        <main className="flex-1 pb-20">{children}</main>

        {/* Bottom Navigation */}
        <FooterNav />
      </div>
    </QueryClientProvider>
  )
}
