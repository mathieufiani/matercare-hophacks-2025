import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import os

# -----------------------------
# Initialize Gemini API client
# -----------------------------
from google import genai
client = genai.Client(api_key="AIzaSyBwJ2qUSTNBtzVpNG89MqNuz9iZM654URk") 

# -----------------------------
# 1. CNN definition (same as training)
# -----------------------------
class TinyCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.pool = nn.MaxPool2d(2,2)
        self.fc1 = nn.Linear(32*12*12, 64)
        self.fc2 = nn.Linear(64, 3)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

# -----------------------------
# 2. Load model
# -----------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
model = TinyCNN().to(device)
model.load_state_dict(torch.load("models/emotion_cnn.pth", map_location=device))
model.eval()

classes = ['happy', 'sad', 'neutral']
transform = transforms.Compose([
    transforms.Resize((48,48)),
    transforms.Grayscale(),
    transforms.ToTensor(),
])

# -----------------------------
# 3. Capture single photo
# -----------------------------
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
cap.release()

if not ret:
    print("❌ Could not capture image.")
    exit()

# -----------------------------
# 4. Face detection
# -----------------------------
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
faces = face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5)

if len(faces) == 0:
    print("❌ No face detected. Exiting.")
    exit()
else:
    print(f"✅ Detected {len(faces)} face(s). Continuing...")

# -----------------------------
# 5. Convert to PIL image and tensor
# -----------------------------
img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
img_t = transform(img).unsqueeze(0).to(device)

# -----------------------------
# 6. Predict emotion percentages
# -----------------------------
with torch.no_grad():
    outputs = model(img_t)
    probs = F.softmax(outputs, dim=1).cpu().numpy()[0]

print("\nEmotion percentages:")
for i, cls in enumerate(classes):
    print(f"{cls}: {probs[i]*100:.2f}%")

# -----------------------------
# 7. Build Gemini prompt
# -----------------------------
prompt = f"""
You are an empathetic virtual companion helping a postpartum mother with her mental wellness.
Start the session based on her current facial emotions:

Happy: {probs[0]*100:.1f}%
Sad: {probs[1]*100:.1f}%
Neutral: {probs[2]*100:.1f}%

Use these percentages to inform your first message.
"""

print("\nGenerated Gemini prompt:\n")
print(prompt)
