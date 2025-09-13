"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Camera } from "lucide-react"
import { VoiceControls } from "@/components/VoiceControls"
import { CameraOptInModal } from "@/components/CameraOptInModal"
import { FERPreview } from "@/components/FERPreview"
import type { MoodResult } from "@/lib/fer"

interface ComposerProps {
  onSendMessage: (content: string, mood?: { label: string; confidence: number }) => void
  disabled?: boolean
}

export function Composer({ onSendMessage, disabled }: ComposerProps) {
  const [message, setMessage] = useState("")
  const [showCameraConsent, setShowCameraConsent] = useState(false)
  const [showCameraPreview, setShowCameraPreview] = useState(false)
  const [cameraConsents, setCameraConsents] = useState<{
    affectAssist: boolean
    storeHistory: boolean
  } | null>(null)
  const [detectedMood, setDetectedMood] = useState<MoodResult | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      const mood = detectedMood
        ? {
            label: detectedMood.mood_label,
            confidence: detectedMood.mood_conf,
          }
        : undefined

      onSendMessage(message.trim(), mood)
      setMessage("")
      setDetectedMood(null)

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleVoiceTranscription = (text: string) => {
    if (text.trim()) {
      const mood = detectedMood
        ? {
            label: detectedMood.mood_label,
            confidence: detectedMood.mood_conf,
          }
        : undefined

      onSendMessage(text.trim(), mood)
      setDetectedMood(null)
    }
  }

  const handleVoiceError = (error: string) => {
    console.error("Voice error:", error)
    // Could show a toast notification here
  }

  const handleCameraClick = () => {
    if (cameraConsents?.affectAssist) {
      setShowCameraPreview(true)
    } else {
      setShowCameraConsent(true)
    }
  }

  const handleCameraConsent = (consents: { affectAssist: boolean; storeHistory: boolean }) => {
    setCameraConsents(consents)
    if (consents.affectAssist) {
      setShowCameraPreview(true)
    }
  }

  const handleMoodDetected = (mood: MoodResult) => {
    setDetectedMood(mood)
  }

  const handleCameraError = (error: string) => {
    console.error("Camera error:", error)
    // Could show a toast notification here
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Mood Indicator */}
        {detectedMood && (
          <div className="glass rounded-lg p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm">😊</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Detected mood: {detectedMood.mood_label} ({Math.round(detectedMood.mood_conf * 100)}%)
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDetectedMood(null)}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}

        {/* Main Input Area */}
        <div className="glass rounded-2xl p-3 flex items-end gap-3">
          <VoiceControls onTranscription={handleVoiceTranscription} onError={handleVoiceError} disabled={disabled} />

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Share how you're feeling..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={disabled}
          />

          {/* Camera Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`flex-shrink-0 w-10 h-10 rounded-xl ${detectedMood ? "bg-primary/10 text-primary" : ""}`}
            onClick={handleCameraClick}
          >
            <Camera className="w-5 h-5" />
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            className="flex-shrink-0 w-10 h-10 rounded-xl"
            disabled={!message.trim() || disabled}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>

      {/* Camera Consent Modal */}
      <CameraOptInModal open={showCameraConsent} onOpenChange={setShowCameraConsent} onConsent={handleCameraConsent} />

      {/* Camera Preview Modal */}
      <FERPreview
        open={showCameraPreview}
        onOpenChange={setShowCameraPreview}
        onMoodDetected={handleMoodDetected}
        onError={handleCameraError}
      />
    </>
  )
}
