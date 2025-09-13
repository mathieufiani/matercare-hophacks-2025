"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Check if speech synthesis is supported
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window

  const speak = useCallback(
    async (text: string, audioUrl?: string) => {
      if (!text.trim()) return

      // Stop any current speech
      stop()

      try {
        // If audio URL is provided, play audio instead of TTS
        if (audioUrl) {
          setIsPlaying(true)

          if (!audioRef.current) {
            audioRef.current = new Audio()
          }

          audioRef.current.src = audioUrl
          audioRef.current.volume = volume

          audioRef.current.onended = () => {
            setIsPlaying(false)
          }

          audioRef.current.onerror = () => {
            setIsPlaying(false)
            // Fallback to TTS if audio fails
            speakWithTTS(text)
          }

          await audioRef.current.play()
          return
        }

        // Use browser TTS
        speakWithTTS(text)
      } catch (error) {
        console.error("TTS Error:", error)
        setIsPlaying(false)
        setIsSpeaking(false)
      }
    },
    [volume],
  )

  const speakWithTTS = useCallback(
    (text: string) => {
      if (!isSupported) {
        console.warn("Speech synthesis not supported")
        return
      }

      setIsSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      // Configure voice settings
      utterance.volume = volume
      utterance.rate = rate
      utterance.pitch = pitch

      // Try to use a female voice for maternal wellness context
      const voices = speechSynthesis.getVoices()
      const femaleVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("woman") ||
          voice.name.toLowerCase().includes("samantha") ||
          voice.name.toLowerCase().includes("karen"),
      )

      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error)
        setIsSpeaking(false)
        utteranceRef.current = null
      }

      speechSynthesis.speak(utterance)
    },
    [isSupported, volume, rate, pitch],
  )

  const stop = useCallback(() => {
    // Stop TTS
    if (isSupported && speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    setIsSpeaking(false)
    setIsPlaying(false)
    utteranceRef.current = null
  }, [isSupported])

  const pause = useCallback(() => {
    if (isSupported && speechSynthesis.speaking) {
      speechSynthesis.pause()
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [isSupported])

  const resume = useCallback(() => {
    if (isSupported && speechSynthesis.paused) {
      speechSynthesis.resume()
    }

    if (audioRef.current) {
      audioRef.current.play()
    }
  }, [isSupported])

  // Load voices when they become available
  useEffect(() => {
    if (!isSupported) return

    const loadVoices = () => {
      speechSynthesis.getVoices()
    }

    // Load voices immediately if available
    loadVoices()

    // Also load when voices change (some browsers load them asynchronously)
    speechSynthesis.addEventListener("voiceschanged", loadVoices)

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
  }, [isSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isSpeaking,
    isSupported,
    volume,
    setVolume,
    rate,
    setRate,
    pitch,
    setPitch,
  }
}
