"use client"
import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, X, RotateCcw, Check, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { analyzeMood, type MoodResult } from "@/lib/fer"
import { getMoodInfo, formatMoodConfidence } from "@/lib/fer/labels"

interface FERPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoodDetected: (mood: MoodResult) => void
  onError: (error: string) => void
}

export function FERPreview({ open, onOpenChange, onMoodDetected, onError }: FERPreviewProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [moodResult, setMoodResult] = useState<MoodResult | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isStreamActive, setIsStreamActive] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start/stop camera with modal lifecycle
  useEffect(() => {
    if (!open) {
      cleanup()
      return
    }
    // don’t auto-start; wait for user gesture (Enable Camera button)
    setCapturedImage(null)
    setMoodResult(null)
    setIsCapturing(false)
    setIsAnalyzing(false)
    setHasPermission(null)
    setIsStreamActive(false)

    // Pause/resume when tab visibility changes
    const onVis = () => {
      if (document.hidden) {
        pauseStream()
      } else if (open && !isStreamActive) {
        // try to resume silently
        void initializeCamera()
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        // audio not needed
      })

      streamRef.current = stream
      setHasPermission(true)

      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        // iOS/Safari needs these + an awaited play() after a user gesture
        video.setAttribute("playsinline", "true")
        video.muted = true
        await video.play()
        setIsStreamActive(true)
      }
    } catch (error) {
      console.error("Camera access error:", error)
      setHasPermission(false)
      setIsStreamActive(false)
      onError("Camera access denied. Please allow camera permissions to use mood detection.")
    }
  }

  const pauseStream = () => {
    const stream = streamRef.current
    if (!stream) return
    stream.getTracks().forEach((t) => t.enabled && (t.enabled = false))
    setIsStreamActive(false)
  }

  const resumeStream = async () => {
    const stream = streamRef.current
    if (!stream) return initializeCamera()
    stream.getTracks().forEach((t) => (t.enabled = true))
    const video = videoRef.current
    if (video && video.paused) await video.play()
    setIsStreamActive(true)
  }

  const cleanup = () => {
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreamActive(false)
    setCapturedImage(null)
    setMoodResult(null)
    setIsCapturing(false)
    setIsAnalyzing(false)
  }

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setIsCapturing(false)
      return
    }

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCapturedImage(url)
      }
    })

    setIsAnalyzing(true)
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const result = await analyzeMood(imageData)
      setMoodResult(result)
    } catch (error) {
      console.error("Mood analysis error:", error)
      onError("Failed to analyze mood. Please try again.")
    } finally {
      setIsAnalyzing(false)
      setIsCapturing(false)
    }
  }

  const retakePhoto = () => {
    if (capturedImage) URL.revokeObjectURL(capturedImage)
    setCapturedImage(null)
    setMoodResult(null)
    // Ensure the live stream is visible again
    if (!isStreamActive && hasPermission) void resumeStream()
  }

  const confirmMood = () => {
    if (moodResult) {
      onMoodDetected(moodResult)
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    if (capturedImage) URL.revokeObjectURL(capturedImage)
    onOpenChange(false)
  }

  // Dedicated prompt when permission explicitly denied
  if (hasPermission === false) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto glass rounded-2xl flex items-center justify-center">
              <Camera className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Camera Access Required</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Please allow camera access to use mood detection.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Check your browser’s site permissions and OS privacy settings, then try again.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 glass bg-transparent">
                Cancel
              </Button>
              <Button onClick={initializeCamera} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Mood Detection
          </DialogTitle>
          <DialogDescription>
            {capturedImage ? "Review your mood analysis" : "Position your face in the frame and capture"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera/Preview Area */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Face detection overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary/50 rounded-full animate-pulse" />
                </div>

                {/* Stream controls / enable prompt */}
                {!isStreamActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-muted-foreground">Camera is off</p>
                      <div className="flex gap-2">
                        <Button onClick={initializeCamera}>
                          <Camera className="w-4 h-4 mr-2" />
                          Enable Camera
                        </Button>
                        {hasPermission && (
                          <Button variant="outline" onClick={resumeStream} className="glass bg-transparent">
                            Resume
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Captured frame"
                className="w-full h-full object-cover"
              />
            )}

            {/* Loading overlay */}
            {(isCapturing || isAnalyzing) && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="glass rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">{isCapturing ? "Capturing..." : "Analyzing mood..."}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mood Result */}
          <AnimatePresence>
            {moodResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <Card className="glass border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${getMoodInfo(moodResult.mood_label).bgColor}`}
                      >
                        <span className="text-2xl">{getMoodInfo(moodResult.mood_label).icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${getMoodInfo(moodResult.mood_label).color}`}>
                          {getMoodInfo(moodResult.mood_label).label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getMoodInfo(moodResult.mood_label).description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {formatMoodConfidence(moodResult.mood_conf)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1 glass bg-transparent">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            {!capturedImage ? (
              <Button onClick={captureFrame} disabled={isCapturing || isAnalyzing || !isStreamActive} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={retakePhoto} className="flex-1 glass bg-transparent">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmMood} disabled={!moodResult} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Use This
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}