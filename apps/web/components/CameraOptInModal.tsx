"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Camera, Shield, Eye, AlertTriangle } from "lucide-react"
import { motion } from "framer-motion"

interface CameraOptInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConsent: (consents: { affectAssist: boolean; storeHistory: boolean }) => void
}

export function CameraOptInModal({ open, onOpenChange, onConsent }: CameraOptInModalProps) {
  const [affectAssist, setAffectAssist] = useState(false)
  const [storeHistory, setStoreHistory] = useState(false)
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false)

  const handleProceed = () => {
    onConsent({ affectAssist, storeHistory })
    onOpenChange(false)
  }

  const canProceed = hasReadPrivacy && affectAssist

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 mx-auto glass rounded-2xl flex items-center justify-center"
          >
            <Camera className="w-8 h-8 text-primary" />
          </motion.div>
          <div>
            <DialogTitle className="text-xl font-bold">Camera Access</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Help us understand your mood with facial expression analysis
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Privacy Notice */}
          <div className="glass rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="w-4 h-4 text-accent" />
              Privacy First
            </div>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>Analysis happens entirely on your device</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>No photos are stored or sent to our servers</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>Only mood labels and confidence scores are shared</span>
              </li>
            </ul>
          </div>

          {/* Consent Options */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="affect-assist"
                checked={affectAssist}
                onCheckedChange={(checked) => setAffectAssist(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="affect-assist" className="text-sm font-medium">
                  Enable Affect Assist (Required)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow on-device analysis of facial expressions to better understand your emotional state and provide
                  personalized support.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="store-history"
                checked={storeHistory}
                onCheckedChange={(checked) => setStoreHistory(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="store-history" className="text-sm font-medium">
                  Store Mood History (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Save mood data to track patterns over time and provide insights into your emotional wellbeing journey.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy-read"
                checked={hasReadPrivacy}
                onCheckedChange={(checked) => setHasReadPrivacy(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="privacy-read" className="text-sm font-medium">
                  I have read and understand the privacy notice
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 glass bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleProceed} disabled={!canProceed} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
