"use client"

export const MOOD_LABELS = {
  calm: {
    label: "Calm",
    description: "Feeling peaceful and relaxed",
    color: "text-accent",
    bgColor: "bg-accent/10",
    icon: "😌",
  },
  sad: {
    label: "Sad",
    description: "Feeling down or melancholy",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: "😢",
  },
  anxious: {
    label: "Anxious",
    description: "Feeling worried or stressed",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    icon: "😰",
  },
  neutral: {
    label: "Neutral",
    description: "Feeling balanced and steady",
    color: "text-muted-foreground",
    bgColor: "bg-muted/20",
    icon: "😐",
  },
} as const

export type MoodLabel = keyof typeof MOOD_LABELS

export function getMoodInfo(mood: MoodLabel) {
  return MOOD_LABELS[mood] || MOOD_LABELS.neutral
}

export function formatMoodConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
