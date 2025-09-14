# src/services/fer_service.py
import io
import base64
from typing import Dict, Optional, Tuple

import numpy as np
import cv2
from PIL import Image, ImageOps

import torch
import torch.nn.functional as F
from torchvision import transforms
import torch.nn as nn


# ────────────────────────────────────────────────────────────────
# 1) Model definition (same as your script)
# ────────────────────────────────────────────────────────────────
class TinyCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(32 * 12 * 12, 64)
        self.fc2 = nn.Linear(64, 3)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x


# ────────────────────────────────────────────────────────────────
# 2) Load model & preprocessing (module import = 1-time cost)
# ────────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
_model = TinyCNN().to(device)

# Adjust the path if your weight file lives elsewhere
_STATE_PATH = "emotion_cnn.pth"  # e.g. apps/server/emotion_cnn.pth
_state = torch.load(_STATE_PATH, map_location=device)
_model.load_state_dict(_state)
_model.eval()

_classes = ["happy", "sad", "neutral"]

_transform = transforms.Compose([
    transforms.Resize((48, 48)),
    transforms.Grayscale(),
    transforms.ToTensor(),
])

# Haar cascade
_face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
_face_cascade = cv2.CascadeClassifier(_face_cascade_path)
if _face_cascade.empty():
    raise RuntimeError(f"Failed to load Haar cascade at {_face_cascade_path}")


# ────────────────────────────────────────────────────────────────
# 3) Helpers
# ────────────────────────────────────────────────────────────────
def _decode_base64_image(data_uri: str) -> Image.Image:
    """Accepts pure base64 or data URL; returns RGB PIL with EXIF fixed."""
    if "," in data_uri:
        _, b64 = data_uri.split(",", 1)
    else:
        b64 = data_uri
    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    return img


def _detect_largest_face(bgr_img: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """(x, y, w, h) of the largest face, or None."""
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return int(x), int(y), int(w), int(h)


# ────────────────────────────────────────────────────────────────
# 4) Public API (call from your route)
# ────────────────────────────────────────────────────────────────
def classify_base64_image(image_b64: str) -> Dict:
    """
    decode base64 -> detect face -> crop -> transform -> predict
    Returns: { prediction, probs, face_box }
    Raises ValueError('no_face_detected') if no face found.
    """
    pil_img = _decode_base64_image(image_b64)
    np_rgb = np.array(pil_img)
    np_bgr = cv2.cvtColor(np_rgb, cv2.COLOR_RGB2BGR)

    box = _detect_largest_face(np_bgr)
    if box is None:
        raise ValueError("no_face_detected")

    x, y, w, h = box
    face_pil = pil_img.crop((x, y, x + w, y + h))

    img_t = _transform(face_pil).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = _model(img_t)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]

    top_idx = int(np.argmax(probs))
    return {
        "prediction": _classes[top_idx],
        "probs": {_classes[i]: float(probs[i]) for i in range(len(_classes))},
        "face_box": {"x": x, "y": y, "w": w, "h": h},
    }