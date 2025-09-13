"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition"

interface UseVoiceRecordingOptions {
  onTranscription: (text: string) => void
  onError: (error: string) => void
}

export function useVoiceRecording({ onTranscription, onError }: UseVoiceRecordingOptions) {
  // UI state you already had
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // react-speech-recognition state
  const {
    transcript: libTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    browserSupportsContinuousListening,
  } = useSpeechRecognition()

  // mirror transcript locally (keeps your original API intact)
  const [transcript, setTranscript] = useState("")
  useEffect(() => {
    setTranscript(libTranscript ?? "")
  }, [libTranscript])

  // Audio analysis (for your VU meter)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>()

  // Support check on mount
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      onError("Speech recognition is not supported by this browser")
    }
    // permissions API is optional, not supported everywhere
    ;(async () => {
      try {
        const permission = await navigator.permissions?.query?.({ name: "microphone" as PermissionName })
        if (permission) {
          setHasPermission(permission.state === "granted")
          permission.addEventListener?.("change", () => {
            setHasPermission(permission.state === "granted")
          })
          return
        }
        setHasPermission(null)
      } catch {
        setHasPermission(null)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // close immediately; we'll grab it again when starting
      stream.getTracks().forEach((t) => t.stop())
      setHasPermission(true)
      return true
    } catch {
      setHasPermission(false)
      onError("Microphone permission denied")
      return false
    }
  }, [onError])

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length
    setAudioLevel(Math.min(100, average))
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }, [])

  const startRecording = useCallback(async () => {
    try {
      if (!browserSupportsSpeechRecognition) {
        onError("Speech recognition is not supported by this browser")
        return
      }
      if (isMicrophoneAvailable === false) {
        onError("Microphone is not available")
        return
      }

      // Ask for permission / get a stream for visualizer
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream

      // AudioContext + Analyser for VU meter
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyzeAudio()

      // Clear old transcript (local + lib)
      setTranscript("")
      resetTranscript()

      // Start listening with library
      await SpeechRecognition.startListening({
        continuous: !!browserSupportsContinuousListening, // try continuous where supported
        language: "en-US",
        interimResults: true,
      })
      // `listening` becomes true via the hook
    } catch (err) {
      console.error("Error starting recording:", err)
      onError("Failed to start recording. Please check your microphone permissions.")
      // Clean up partially initialized audio graph
      try {
        audioContextRef.current?.close()
      } catch {}
      audioContextRef.current = null
      analyserRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [
    analyzeAudio,
    browserSupportsContinuousListening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
    onError,
    resetTranscript,
  ])

  const stopRecording = useCallback(async () => {
    setIsProcessing(true)
    try {
      // Stop library listening first (graceful stop)
      await SpeechRecognition.stopListening()
    } catch {
      // Fallback: abort if stop fails
      try {
        await SpeechRecognition.abortListening()
      } catch {}
    }

    // Stop our animation
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

    // Tear down audio nodes
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close()
      } catch {}
      audioContextRef.current = null
    }
    analyserRef.current = null

    // Stop our stream (visualizer)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    // Dispatch transcript to consumer
    const finalText = (libTranscript ?? "").trim()
    if (finalText) onTranscription(finalText)

    setIsProcessing(false)
    setAudioLevel(0)
  }, [libTranscript, onTranscription])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        SpeechRecognition.abortListening()
      } catch {}
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  return {
    isRecording: listening,        // mapped from library
    isProcessing,
    transcript,
    audioLevel,
    hasPermission,
    startRecording,
    stopRecording,
    requestPermission,
  }
}