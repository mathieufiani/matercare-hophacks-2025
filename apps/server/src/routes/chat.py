# src/routes/chat.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from uuid import uuid4

from src.controllers.chat_service import gemini_answer  # renamed import

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/send", methods=["POST"])  # align with frontend: POST /chat
@jwt_required()
def chat():
    payload = request.get_json(silent=True) or {}

    text = payload.get("text")
    if not text:
        return jsonify({"error": "Field 'text' is required"}), 400

    user_id_from_jwt = str(get_jwt_identity())
    # Optionally enforce body user_id matches JWT:
    # user_id_from_body = payload.get("user_id")
    # if user_id_from_body and str(user_id_from_body) != user_id_from_jwt:
    #     return jsonify({"error": "user_id mismatch"}), 403

    try:
        reply_text = gemini_answer(text, user_id=user_id_from_jwt)
    except Exception as e:
        # Log full traceback server-side; return generic error to client
        current_app.logger.exception("Gemini error")
        return jsonify({"error": "LLM call failed"}), 502

    return jsonify({
        "message_id": str(uuid4()),
        "risk_level": "low",
        "next_action": "reply",
        "reply_text": reply_text,
        "context_cards": [],
        "audit": {
            "used_guardrail": False,
            "retrieved_k": 0,
        },
    }), 200