# src/routes/fer.py
from flask import Blueprint, request, jsonify
from src.controllers.fer_service import classify_base64_image

fer_bp = Blueprint("fer", __name__)

@fer_bp.route("/detect_emotion", methods=["POST"])
def detect_emotion():
    """
    POST JSON with one of: 'photo', 'photo_base64', 'image_base64'
    Returns { prediction, probs, face_box } or { error }.
    """
    data = request.get_json(silent=True) or {}
    image_b64 = data.get("photo") or data.get("photo_base64") or data.get("image_base64")

    if not image_b64:
        return jsonify({"error": "missing 'photo' (or 'photo_base64'/'image_base64')"}), 400

    try:
        result = classify_base64_image(image_b64)
        return jsonify(result), 200
    except ValueError as ve:
        if str(ve) == "no_face_detected":
            return jsonify({"error": "No face detected"}), 422
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "internal_error"}), 500