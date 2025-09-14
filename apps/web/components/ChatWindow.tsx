"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChatMessage } from "@/components/ChatMessage"
import { Composer } from "@/components/Composer"
import { ContextCard } from "@/components/ContextCard"
import { useMutation } from "@tanstack/react-query"
import { chatAPI, type ChatMessage as ChatMessageType, type ChatResponse } from "@/lib/api"
import { getCurrentTimestamp } from "@/lib/time"
import { useTTS } from "@/hooks/use-tts"
import { Heart, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserIdFromToken } from "@/lib/jwt"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: string
  isStreaming?: boolean
  contextCards?: ChatResponse["context_cards"]
  mood?: {
    label: string
    confidence: number
  }
  audioUrl?: string
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: ChatMessageType) => {
      return chatAPI.sendMessage(messageData)
    },
    onSuccess: (response) => {
      // Simulate streaming response
      setIsTyping(true)
      setStreamingContent("")

      const words = response.reply_text.split(" ")
      let currentIndex = 0

      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          setStreamingContent((prev) => prev + (currentIndex === 0 ? "" : " ") + words[currentIndex])
          currentIndex++
        } else {
          clearInterval(streamInterval)
          setIsTyping(false)

          // Add the complete message
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

          if ((response as any).audio_url) {
            speak(response.reply_text, (response as any).audio_url)
          }
        }
      }, 50)
    },
    onError: (error) => {
      console.error("Failed to send message:", error)
      setIsTyping(false)
      setStreamingContent("")

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: getCurrentTimestamp(),
      }

      setMessages((prev) => [...prev, errorMessage])
    },
  })

  const handleSendMessage = (content: string, mood?: { label: string; confidence: number }) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content,
      timestamp: getCurrentTimestamp(),
      mood,
    }

    setMessages((prev) => [...prev, userMessage])

    const messageData: ChatMessageType = {
      user_id: sessionStorage.getItem("user_id") || "", // This would come from auth context
      text: content,
      // mood_label: mood?.label as any,
      // mood_conf: mood?.confidence,
      client_time: getCurrentTimestamp(),
      consents: {
        affect_assist: true,
        store_history: true,
      },
    }

    sendMessageMutation.mutate(messageData)
  }

  const handlePlayMessageAudio = (message: Message) => {
    if (message.audioUrl) {
      speak(message.content, message.audioUrl)
    } else {
      speak(message.content)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
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
            {isSpeaking ? (
              <VolumeX className="w-5 h-5 text-destructive" />
            ) : (
              <Volume2 className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChatMessage
                type={message.type}
                content={message.content}
                timestamp={message.timestamp}
                mood={message.mood}
                onPlayAudio={() => handlePlayMessageAudio(message)}
                hasAudio={!!message.audioUrl || message.type === "assistant"}
              />

              {/* Context Cards */}
              {message.contextCards && message.contextCards.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.contextCards.map((card, index) => (
                    <ContextCard
                      key={index}
                      title={card.title}
                      summary={card.summary}
                      source={card.source}
                      url={card.url}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming Message */}
        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 glass rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
              <div className="text-sm">
                {streamingContent}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
                  className="inline-block w-2 h-4 bg-primary ml-1"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Typing Indicator */}
        {sendMessageMutation.isPending && !isTyping && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-8 h-8 glass rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                  className="w-2 h-2 bg-muted-foreground rounded-full"
                />
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
    </div>
  )
}
