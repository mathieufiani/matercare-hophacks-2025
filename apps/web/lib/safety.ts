export interface CrisisResource {
  name: string
  phone: string
  text?: string
  website: string
  description: string
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    text: "Text HOME to 741741",
    website: "https://988lifeline.org",
    description: "24/7 free and confidential support for people in distress",
  },
  {
    name: "Postpartum Support International",
    phone: "1-944-4-WARMLINE",
    website: "https://www.postpartum.net",
    description: "Specialized support for perinatal mental health",
  },
  {
    name: "Crisis Text Line",
    phone: "",
    text: "Text HOME to 741741",
    website: "https://www.crisistextline.org",
    description: "24/7 crisis support via text message",
  },
]

export function shouldShowCrisisBanner(riskLevel: string): boolean {
  return riskLevel === "high"
}

export function getQuickExitUrl(): string {
  return "https://www.weather.com"
}

export function clearChatHistory(): void {
  // Clear sensitive data from local storage
  if (typeof window !== "undefined") {
    localStorage.removeItem("matercare-chat-history")
    localStorage.removeItem("matercare-mood-data")
    sessionStorage.clear()
  }
}
