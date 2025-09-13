"use client"
import { Heart, User, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatMessageTime } from "@/lib/time"

interface ChatMessageProps {
  type: "user" | "assistant"
  content: string
  timestamp: string
  mood?: {
    label: string
    confidence: number
  }
  onPlayAudio?: () => void
  hasAudio?: boolean
}

export function ChatMessage({ type, content, timestamp, mood, onPlayAudio, hasAudio }: ChatMessageProps) {
  const isUser = type === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 glass rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary/10" : ""
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-primary" /> : <Heart className="w-4 h-4 text-primary" />}
      </div>

      {/* Message Content */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`glass rounded-2xl p-4 ${
            isUser ? "rounded-tr-sm bg-primary/10 border-primary/20" : "rounded-tl-sm"
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>

          {/* Mood indicator for user messages */}
          {mood && isUser && (
            <div className="mt-2 text-xs text-muted-foreground">
              Mood: {mood.label} ({Math.round(mood.confidence * 100)}% confidence)
            </div>
          )}

          {hasAudio && !isUser && onPlayAudio && (
            <div className="mt-2 flex justify-end">
              <Button variant="ghost" size="sm" onClick={onPlayAudio} className="h-6 px-2 text-xs hover:bg-accent/10">
                <Volume2 className="w-3 h-3 mr-1" />
                Listen
              </Button>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={`text-xs text-muted-foreground mt-1 ${isUser ? "text-right" : ""}`}>
          {formatMessageTime(timestamp)}
        </div>
      </div>
    </div>
  )
}
