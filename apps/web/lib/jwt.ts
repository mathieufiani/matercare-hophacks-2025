import {jwtDecode} from "jwt-decode"

interface JwtPayload {
  sub: string // Flask-JWT-Extended sets the identity here
  email?: string
  exp: number
  iat: number
}

export function getUserIdFromToken(): string | null {
  const token = sessionStorage.getItem("access_token")
  if (!token) return null
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    return decoded.sub // this is your user_id
  } catch {
    return null
  }
}