"use client"

import * as tf from "@tensorflow/tfjs"

// 1) Define labels and types at module scope
const EMOTION_LABELS = [
  "angry",
  "disgust",
  "fear",
  "happy",
  "sad",
  "surprise",
  "neutral",
] as const
type Emotion = (typeof EMOTION_LABELS)[number]

export interface MoodResult {
  mood_label: "calm" | "sad" | "anxious" | "neutral"
  mood_conf: number
}

export interface FERModel {
  predict: (imageData: ImageData) => Promise<MoodResult>
  isLoaded: boolean
}

export class FERClient {
  private model: tf.LayersModel | null = null
  private isLoading = false
  private isLoaded = false

  // 2) Map is typed with the Emotion union
  private readonly emotionToMood: Record<
    Emotion,
    "calm" | "sad" | "anxious" | "neutral"
  > = {
    angry: "anxious",
    disgust: "anxious",
    fear: "anxious",
    happy: "calm",
    sad: "sad",
    surprise: "neutral",
    neutral: "neutral",
  }

  async loadModel(): Promise<void> {
    if (this.isLoaded || this.isLoading) return
    this.isLoading = true
    try {
      // Simulated load for demo
      await new Promise((r) => setTimeout(r, 2000))
      this.model = await this.createMockModel()
      this.isLoaded = true
    } catch (error) {
      console.error("Failed to load FER model:", error)
      throw new Error("Failed to load emotion recognition model")
    } finally {
      this.isLoading = false
    }
  }

  private async createMockModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.flatten({ inputShape: [48, 48, 1] }),
        tf.layers.dense({ units: 128, activation: "relu" }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: EMOTION_LABELS.length, activation: "softmax" }),
      ],
    })
    model.compile({
      optimizer: "adam",
      loss: "categoricalCrossentropy",
      metrics: ["accuracy"],
    })
    return model
  }

  async predict(imageData: ImageData): Promise<MoodResult> {
    if (!this.isLoaded || !this.model) {
      throw new Error("Model not loaded. Call loadModel() first.")
    }

    // Always release tensors, even on error
    let preprocessed: tf.Tensor | null = null
    let prediction: tf.Tensor | null = null

    try {
      // Preprocess
      preprocessed = this.preprocessImage(imageData)

      // Predict
      prediction = this.model.predict(preprocessed) as tf.Tensor
      const probsTyped = await prediction.data() // TypedArray
      const probabilities = Array.from(probsTyped) // make it a normal array

      // Guard: if something went wrong, bail out safely
      if (probabilities.length !== EMOTION_LABELS.length) {
        return { mood_label: "neutral", mood_conf: 0.5 }
      }

      // Argmax
      let maxIndex = 0
      let maxVal = probabilities[0] ?? -Infinity
      for (let i = 1; i < probabilities.length; i++) {
        const v = probabilities[i] ?? -Infinity
        if (v > maxVal) {
          maxVal = v
          maxIndex = i
        }
      }
      

      // 3) Guard the label access (default to "neutral" if out of range)
      const emotion: Emotion =
        EMOTION_LABELS[maxIndex] ?? "neutral"

      const mood_label = this.emotionToMood[emotion]
      const mood_conf = Math.max(0, Math.min(1, maxVal ?? 0))

      return { mood_label, mood_conf }
    } catch (error) {
      console.error("Prediction error:", error)
      return { mood_label: "neutral", mood_conf: 0.5 }
    } finally {
      // Cleanup
      if (prediction) prediction.dispose()
      if (preprocessed) preprocessed.dispose()
    }
  }

  private preprocessImage(imageData: ImageData): tf.Tensor {
    // Convert ImageData to grayscale tensor
    const tensor = tf.browser.fromPixels(imageData, 1)
    const resized = tf.image.resizeBilinear(tensor, [48, 48])
    const normalized = resized.div(255)
    const batched = normalized.expandDims(0)
    tensor.dispose()
    resized.dispose()
    normalized.dispose()
    return batched
  }

  get loaded(): boolean {
    return this.isLoaded
  }
  get loading(): boolean {
    return this.isLoading
  }
}

// Singleton
export const ferClient = new FERClient()

export async function initializeFER(): Promise<void> {
  await ferClient.loadModel()
}

export async function analyzeMood(imageData: ImageData): Promise<MoodResult> {
  if (!ferClient.loaded) {
    await ferClient.loadModel()
  }
  return ferClient.predict(imageData)
}