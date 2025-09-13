"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, Volume2, VolumeX, Play, Square } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useVoiceRecording } from "@/hooks/use-voice-recording"
import { useTTS } from "@/hooks/use-tts"

interface VoiceControlsProps {
  onTranscription: (text: string) => void
  onError: (error: string) => void
  disabled?: boolean
}

export function VoiceControls({ onTranscription, onError, disabled }: VoiceControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    isRecording,
    isProcessing,
    transcript,
    audioLevel,
    startRecording,
    stopRecording,
    hasPermission,
    requestPermission,
  } = useVoiceRecording({
    onTranscription,
    onError,
  })

  const { speak, stop: stopSpeaking, isPlaying, isSpeaking, volume, setVolume } = useTTS()

  const handleToggleRecording = async () => {
    if (!hasPermission) {
      const granted = await requestPermission()
      if (!granted) {
        onError("Microphone permission is required for voice messages")
        return
      }
    }

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
      setIsExpanded(true)
    }
  }

  const handleTestTTS = () => {
    if (isSpeaking) {
      stopSpeaking()
    } else {
      speak("Hello! I'm your MaterCare assistant. How can I support you today?")
    }
  }

  return (
    <div className="space-y-3">
      {/* Main Voice Button */}
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        className={`w-10 h-10 rounded-xl glass transition-all duration-300 ${
          isRecording ? "bg-destructive/20 border-destructive/50 scale-110" : ""
        } ${isProcessing ? "animate-pulse" : ""}`}
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Mic className="w-5 h-5" />
          </motion.div>
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>

      {/* Expanded Voice Controls */}
      <AnimatePresence>
        {(isExpanded || isRecording) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-strong">
              <CardContent className="p-4 space-y-4">
                {/* Recording Status */}
                <div className="text-center">
                  {isRecording ? (
                    <div className="space-y-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                        className="w-4 h-4 bg-destructive rounded-full mx-auto"
                      />
                      <p className="text-sm text-destructive font-medium">Recording...</p>
                      <p className="text-xs text-muted-foreground">Tap the mic button to stop</p>
                    </div>
                  ) : isProcessing ? (
                    <div className="space-y-2">
                      <div className="flex justify-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{
                              duration: 0.6,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.2,
                            }}
                            className="w-2 h-2 bg-primary rounded-full"
                          />
                        ))}
                      </div>
                      <p className="text-sm text-primary font-medium">Processing...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Voice Message</p>
                      <p className="text-xs text-muted-foreground">Hold and speak, or tap to start recording</p>
                    </div>
                  )}
                </div>

                {/* Audio Level Indicator */}
                {isRecording && (
                  <div className="space-y-2">
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={`w-1 rounded-full ${audioLevel > i * 10 ? "bg-primary" : "bg-muted"}`}
                          animate={{
                            height: audioLevel > i * 10 ? [4, 16, 4] : 4,
                          }}
                          transition={{
                            duration: 0.3,
                            repeat: audioLevel > i * 10 ? Number.POSITIVE_INFINITY : 0,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript Preview */}
                {transcript && (
                  <div className="glass rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Transcript:</p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}

                {/* TTS Controls */}
                <div className="border-t border-border/50 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">Text-to-Speech</span>
                    <Button variant="ghost" size="sm" onClick={handleTestTTS} className="h-8 px-3">
                      {isSpeaking ? (
                        <>
                          <Square className="w-3 h-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          Test
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume * 100}
                      onChange={(e) => setVolume(Number(e.target.value) / 100)}
                      className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Close Button */}
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)} className="w-full">
                  Close
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
