"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Phone, X, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { clearChatHistory, getQuickExitUrl } from "@/lib/safety"

interface CrisisBannerProps {
  onDismiss: () => void
}

export function CrisisBanner({ onDismiss }: CrisisBannerProps) {
  const handleQuickExit = () => {
    clearChatHistory()
    window.location.href = getQuickExitUrl()
  }

  const handleCallHotline = () => {
    window.location.href = "tel:988"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      className="fixed top-0 left-0 right-0 z-50 p-4"
    >
      <Card className="glass-strong border-destructive/50 bg-destructive/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-destructive mb-2">Immediate Support Available</h3>
              <p className="text-sm text-destructive/80 mb-4">
                If you're in immediate danger or thinking of harming yourself, call 988 (USA) or visit the nearest
                emergency department.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="bg-destructive hover:bg-destructive/90" onClick={handleCallHotline}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call 988 Now
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={handleQuickExit}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Quick Exit
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 w-8 h-8 p-0 text-destructive hover:bg-destructive/10"
              onClick={onDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
