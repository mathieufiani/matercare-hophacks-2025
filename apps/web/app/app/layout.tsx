// ❌ Do NOT import globals.css here
// ❌ Do NOT render <html> or <body>

import type React from "react"
import ClientAppLayout from "./ClientAppLayout"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ClientAppLayout>{children}</ClientAppLayout>
}