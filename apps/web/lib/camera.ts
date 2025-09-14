export async function captureOneShotBase64(opts?: {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
  mirror?: boolean
}): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: opts?.facingMode ?? 'user' },
    audio: false,
  })

  try {
    // Create offscreen video/canvas so nothing shows in UI
    const video = document.createElement('video')
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.srcObject = stream

    // Wait until we have dimensions
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve()
    })
    await video.play()
    await new Promise(requestAnimationFrame)

    const w = opts?.width ?? (video.videoWidth || 640)
    const h = opts?.height ?? (video.videoHeight || 480)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    if (opts?.mirror ?? true) {
      // mirror “selfie” view
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)

    // Base64 (data URL)
    return canvas.toDataURL('image/jpeg', 0.9)
  } finally {
    // Always stop the camera
    stream.getTracks().forEach((t) => t.stop())
  }
}



