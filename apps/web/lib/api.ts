// api.ts
import axios from "axios"

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
  /** optional webcam snapshot to send with chat */
  photo_base64?: string
}

export interface ChatResponse {
  message_id: string
  risk_level: "low" | "medium" | "high"
  next_action: "reply" | "ask_screening" | "start_grounding" | "escalate"
  reply_text: string
  context_cards?: Array<{ title: string; summary: string; source: string; url: string }>
  screening?: { ask_epds: boolean; question_id: number; question_text: string }
  audit: { used_guardrail: boolean; retrieved_k: number }
}

/** Attach access token on every request, unless already set */
api.interceptors.request.use(
  (config) => {
    const existing = config.headers?.Authorization || config.headers?.authorization
    if (!existing) {
      const token = sessionStorage.getItem("access_token")
      if (token) {
        config.headers = config.headers ?? {}
        config.headers["Authorization"] = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

/** Refresh flow */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url: string = originalRequest?.url || ""
    const isAuthRoute = url.startsWith("/api/auth/")

    if (!isAuthRoute && error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = sessionStorage.getItem("refresh_token")
      if (!refreshToken) {
        sessionStorage.clear()
        if (typeof window !== "undefined") window.location.href = "/auth/sign-in"
        return Promise.reject(error)
      }

      originalRequest._retry = true
      try {
        const res = await axios.post(
          `${API_BASE}/api/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )
        const newAccessToken = res.data.access_token
        sessionStorage.setItem("access_token", newAccessToken)

        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        sessionStorage.clear()
        if (typeof window !== "undefined") window.location.href = "/auth/sign-in"
      }
    }
    return Promise.reject(error)
  }
)

export const chatAPI = {
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const { data } = await api.post<ChatResponse>("/api/chat/send", message)
    return data
  },
}

/** 👇 NEW: FER API */
export interface FERDetectResponse {
  prediction: "happy" | "sad" | "neutral"
  probs: Record<string, number>
  face_box: { x: number; y: number; w: number; h: number }
}

export const ferAPI = {
  async detectEmotion(photoBase64: string) {
    const { data } = await api.post<FERDetectResponse>("/api/fer/detect_emotion", {
      photo: photoBase64, // accepts 'photo' | 'photo_base64' | 'image_base64'
    })
    console.log("THIS IS EMOTIONS", data)
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
      if (response.data.user?.user_id) {
        sessionStorage.setItem("user_id", response.data.user.user_id)
      }
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
        await axios.post(
          `${API_BASE}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )
      }
    } catch (err) {
      console.warn("Logout request failed, clearing session anyway.", err)
    } finally {
      sessionStorage.clear()
      return { success: true }
    }
  },

  async forgotPassword(_email: string) {
    return { success: true }
  },
}