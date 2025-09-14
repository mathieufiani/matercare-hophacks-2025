import axios from "axios"

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000"
const API_BASE = "http://127.0.0.1:5000"

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
})
export interface ChatMessage {
  message_id: string
  user_id: string
  text: string
  mood_label?: "calm" | "sad" | "anxious" | "neutral"
  mood_conf?: number
  lang: string
  client_time: string
  consents: {
    affect_assist: boolean
    store_history: boolean
  }
}

export interface ChatResponse {
  message_id: string
  risk_level: "low" | "medium" | "high"
  next_action: "reply" | "ask_screening" | "start_grounding" | "escalate"
  reply_text: string
  context_cards?: Array<{
    title: string
    summary: string
    source: string
    url: string
  }>
  screening?: {
    ask_epds: boolean
    question_id: number
    question_text: string
  }
  audit: {
    used_guardrail: boolean
    retrieved_k: number
  }
}

export const chatAPI = {
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error("Failed to send message")
    }

    return response.json()
  },
}

export const authAPI = {
  async signIn(email: string, password: string) {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      })

      // The backend returns:
      // {
      //   message: "Login successful",
      //   user: { user_id, email },
      //   access_token,
      //   refresh_token,
      //   refresh_expires_at,
      //   session_id
      // }

      return {
        success: true,
        status: response.status,
        data: response.data,
      }
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.error || "Login failed")
      }
      throw new Error("Network error during login")
    }
  },

  async signUp(email: string, password: string) {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || "Failed to register")
    }

    return {
      status: response.status, 
      json: response.json()
    }
  },

  async forgotPassword(email: string) {
    // Placeholder for password reset
    return { success: true }
  },
}
