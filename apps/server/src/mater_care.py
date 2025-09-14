# -----------------------------
# Mater Care - Emotion Capture (Silent)
# -----------------------------

import cv2
from deepface import DeepFace
import sys, os

# -----------------------------
# 1. Class to store emotion data
# -----------------------------
class EmotionData:
    def __init__(self, happy=0.0, sad=0.0, neutral=0.0):
        self.happy = float(happy)
        self.sad = float(sad)
        self.neutral = float(neutral)

    def normalize(self):
        total = self.happy + self.sad + self.neutral
        if total > 0:
            self.happy = (self.happy / total) * 100
            self.sad = (self.sad / total) * 100
            self.neutral = (self.neutral / total) * 100

    def to_dict(self):
        return {"happy": self.happy, "sad": self.sad, "neutral": self.neutral}

# -----------------------------
# 2. Capture webcam image
# -----------------------------
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
cap.release()

if not ret:
    raise RuntimeError("❌ Could not capture image.")

# -----------------------------
# 3. Detect human face
# -----------------------------
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5)

if len(faces) == 0:
    raise RuntimeError("❌ No human face detected. Please try again.")

# -----------------------------
# 4. Analyze emotions (DeepFace, silent)
# -----------------------------
stderr_fileno = sys.stderr
sys.stderr = open(os.devnull, 'w')  # suppress warnings

try:
    result = DeepFace.analyze(
        frame,
        actions=['emotion'],
        enforce_detection=True,
        detector_backend='mtcnn'
    )
finally:
    sys.stderr.close()
    sys.stderr = stderr_fileno  # restore stderr

if isinstance(result, list):
    result = result[0]

emotions = result["emotion"]

# -----------------------------
# 5. Boost sad detection and normalize
# -----------------------------
boost_factor = 10
happy_pct = emotions.get('happy', 0)
sad_pct = emotions.get('sad', 0) * boost_factor
neutral_pct = emotions.get('neutral', 0)
if sad_pct > 100:
    sad_pct = 100

emotion_obj = EmotionData(happy=happy_pct, sad=sad_pct, neutral=neutral_pct)
emotion_obj.normalize()

# -----------------------------
# 6. Prepare data for Gemini submission
# -----------------------------
emotion_list = [emotion_obj.happy, emotion_obj.sad, emotion_obj.neutral]
prompt_text = f"""
You are an empathetic virtual companion helping a postpartum mother with her mental wellness.
Start the session based on her current facial emotions:

Happy: {emotion_obj.happy:.1f}%
Sad: {emotion_obj.sad:.1f}%
Neutral: {emotion_obj.neutral:.1f}%
"""

# -----------------------------
# 7. Store submission data
# -----------------------------
submission_data = {
    "emotions": emotion_obj.to_dict(),
    "prompt_text": prompt_text
}

# -----------------------------
# Optional debug print
# -----------------------------
# print(submission_data)  # Uncomment only for testing
