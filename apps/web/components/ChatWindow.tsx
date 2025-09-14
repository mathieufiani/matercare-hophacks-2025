// ChatWindow.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatMessage as ChatBubble } from "@/components/ChatMessage"
import { Composer } from "@/components/Composer"
import { ContextCard } from "@/components/ContextCard"
import { useMutation } from "@tanstack/react-query"
import {
  chatAPI,
  ferAPI,
  type ChatMessage as ChatMessageType,
  type ChatResponse,
} from "@/lib/api"
import { getCurrentTimestamp } from "@/lib/time"
import { useTTS } from "@/hooks/use-tts"
import { Heart, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserIdFromToken } from "@/lib/jwt"
import { captureOneShotBase64 } from "@/lib/camera"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: string
  isStreaming?: boolean
  contextCards?: ChatResponse["context_cards"]
  mood?: { label: "calm" | "sad" | "neutral"; confidence: number }
  audioUrl?: string
}

/** Brighten/contrast a data URL; returns a new data URL */
async function improveExposure(dataUrl: string, opts?: { brightness?: number; contrast?: number; quality?: number }) {
  const img = new Image()
  img.src = dataUrl
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error("Image load failed"))
  })

  const w = img.naturalWidth || 640
  const h = img.naturalHeight || 480
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl

  const brightness = opts?.brightness ?? 1.35
  const contrast = opts?.contrast ?? 1.08
  ctx.filter = `brightness(${brightness}) contrast(${contrast})`
  ctx.drawImage(img, 0, 0, w, h)

  const quality = opts?.quality ?? 0.92
  return canvas.toDataURL("image/jpeg", quality)
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "Hello! I'm here to support you on your maternal wellness journey. How are you feeling today?",
      timestamp: getCurrentTimestamp(),
    },
  ])
  const [streamingContent, setStreamingContent] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { speak, stop: stopSpeaking, isSpeaking } = useTTS()

  // Snapshot preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(() => { scrollToBottom() }, [messages, streamingContent])

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: ChatMessageType) => chatAPI.sendMessage(messageData),
    onSuccess: (response) => {
      setIsTyping(true)
      setStreamingContent("")
      const words = response.reply_text.split(" ")
      let i = 0
      const streamInterval = setInterval(() => {
        if (i < words.length) {
          setStreamingContent((prev) => prev + (i === 0 ? "" : " ") + words[i])
          i++
        } else {
          clearInterval(streamInterval)
          setIsTyping(false)
          const assistantMessage: Message = {
            id: response.message_id,
            type: "assistant",
            content: response.reply_text,
            timestamp: getCurrentTimestamp(),
            contextCards: response.context_cards,
            audioUrl: (response as any).audio_url,
          }
          setMessages((prev) => [...prev, assistantMessage])
          setStreamingContent("")
          if ((response as any).audio_url) speak(response.reply_text, (response as any).audio_url)
        }
      }, 50)
    },
    onError: () => {
      setIsTyping(false)
      setStreamingContent("")
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "assistant",
          content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
          timestamp: getCurrentTimestamp(),
        },
      ])
    },
  })

  const handleSendMessage = async (
    content: string,
    mood?: { label: "calm" | "sad" | "neutral"; confidence: number }
  ) => {
    const userId = getUserIdFromToken() || sessionStorage.getItem("user_id") || "anonymous"

    // Give the webcam ~900ms to auto-expose before snapshot
    await new Promise((r) => setTimeout(r, 900))

    // Take a snapshot (may fail if camera is blocked)
    const rawPhoto = await captureOneShotBase64().catch(() => null)

    // Brighten/contrast the snapshot if we have one
    const photoBase64 = rawPhoto ? await improveExposure(rawPhoto) : null

    // Show preview modal
    // if (photoBase64) {
    //   setPreviewSrc(photoBase64)
    //   setPreviewOpen(true)
    // }

    // Ask FER for mood (best-effort)
    let moodFromFer: { label: "calm" | "sad" | "neutral"; confidence: number } | undefined
    if (photoBase64) {
      try {
        const fer = await ferAPI.detectEmotion(photoBase64)
        const map: Record<"happy" | "sad" | "neutral", "calm" | "sad" | "neutral"> = {
          happy: "calm",
          sad: "sad",
          neutral: "neutral",
        }
        const mapped = map[fer.prediction]
        const conf = fer.probs?.[fer.prediction] ?? 0
        moodFromFer = { label: mapped, confidence: conf }
      } catch {
        // ignore FER errors, continue without mood
      }
    }

    // Optimistic UI
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        content,
        timestamp: getCurrentTimestamp(),
        mood: mood ?? moodFromFer,
      },
    ])

    // Build payload for chat
    const messageData: ChatMessageType = {
      user_id: userId,
      text: content,
      mood_label: (mood?.label as any) ?? moodFromFer?.label,
      mood_conf: mood?.confidence ?? moodFromFer?.confidence,
      client_time: getCurrentTimestamp(),
      consents: { affect_assist: true, store_history: true },
      photo_base64: photoBase64 || undefined,
    }

    sendMessageMutation.mutate(messageData)
  }

  const handlePlayMessageAudio = (message: Message) => {
    if (message.audioUrl) speak(message.content, message.audioUrl)
    else speak(message.content)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-strong border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">MaterCare Assistant</h1>
              <p className="text-sm text-muted-foreground">Your wellness companion</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (isSpeaking ? stopSpeaking() : null)}
            className="w-10 h-10 rounded-xl"
          >
            {isSpeaking ? <VolumeX className="w-5 h-5 text-destructive" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <ChatBubble
                type={m.type}
                content={m.content}
                timestamp={m.timestamp}
                mood={m.mood}
                onPlayAudio={() => handlePlayMessageAudio(m)}
                hasAudio={!!m.audioUrl || m.type === "assistant"}
              />
              {m.contextCards?.length ? (
                <div className="mt-3 space-y-2">
                  {m.contextCards.map((card, i) => (
                    <ContextCard key={i} title={card.title} summary={card.summary} source={card.source} url={card.url} />
                  ))}
                </div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming */}
        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 glass rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
              <div className="text-sm">
                {streamingContent}
                <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }} className="inline-block w-2 h-4 bg-primary ml-1" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-border/50 p-4 ">
        <Composer onSendMessage={handleSendMessage} disabled={sendMessageMutation.isPending} />
      </div>

      {/* Snapshot Preview Modal */}
      {/* <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Snapshot preview</DialogTitle>
            <DialogDescription>This is the photo captured from your webcam for mood detection.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg overflow-hidden border">
            {previewSrc ? (
              <img src={previewSrc} alt="Captured snapshot" className="w-full h-auto" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No snapshot available.</div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog> */}
    </div>
  )
}