export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export function isWithinBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  // Monday-Friday, 9 AM - 5 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17
}
