// api.ts
import axios from "axios"

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:5000"
const API_BASE = "http://127.0.0.1:5000"

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

export interface ChatMessage {
  user_id: string
  text: string
  mood_label?: "calm" | "sad" | "anxious" | "neutral"
  mood_conf?: number
  client_time?: string
  consents?: {
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

/** Attach access token on every request */
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("access_token")
    if (token) config.headers["Authorization"] = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

/** On 401, try refresh once, then retry the original request */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = sessionStorage.getItem("refresh_token")
        const res = await api.post("/api/auth/refresh", {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
        const newAccessToken = res.data.access_token
        sessionStorage.setItem("access_token", newAccessToken)
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        sessionStorage.clear()
        if (typeof window !== "undefined") window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export const chatAPI = {
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>("/api/chat/send", message)
    console.log('MESSAGE RECEIVED --> ', data)
    return data
  },
}

export const authAPI = {
  async signIn(email: string, password: string) {
    try {
      const response = await api.post("/api/auth/login", { email, password })
      sessionStorage.setItem("access_token", response.data.access_token)
      sessionStorage.setItem("refresh_token", response.data.refresh_token)
      sessionStorage.setItem("user_id", response.data.user.user_id)
      return { success: true, status: response.status, data: response.data }
    } catch (error: any) {
      if (error.response) throw new Error(error.response.data.error || "Login failed")
      throw new Error("Network error during login")
    }
  },

  async signUp(email: string, password: string) {
    try {
      const response = await api.post("/api/auth/register", { email, password })
      sessionStorage.setItem("access_token", response.data.access_token)
      sessionStorage.setItem("refresh_token", response.data.refresh_token)
      sessionStorage.setItem("user_id", response.data.user.user_id)
      return { success: true, status: response.status, data: response.data }
    } catch (error: any) {
      if (error.response) throw new Error(error.response.data.error || "Signup failed")
      throw new Error("Network error during signup")
    }
  },

  async signOut() {
    try {
      const refreshToken = sessionStorage.getItem("refresh_token")
      if (refreshToken) {
        await api.post("/api/auth/logout", {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        })
      }
    } catch (err) {
      console.warn("Logout request failed, clearing session anyway.", err)
    } finally {
      sessionStorage.clear()
      return { success: true }
    }
  },

  async forgotPassword(_email: string) {
    // Placeholder for password reset
    return { success: true }
  },
}