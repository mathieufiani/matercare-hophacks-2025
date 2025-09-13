"use client"
import { AlertTriangle } from "lucide-react"

export function NotAdviceBanner() {
  return (
    <div className="bg-muted/50 border-b border-border/50 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4" />
        <span>MaterCare provides supportive coaching and information. It is not medical advice.</span>
      </div>
    </div>
  )
}
