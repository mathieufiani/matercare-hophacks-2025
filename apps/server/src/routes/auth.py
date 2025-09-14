# src/routes/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from src.extensions import db
from src.models.users import Users

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # 1. Validate input
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # 2. Check if user already exists
    existing_user = Users.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    # 3. Hash password
    hashed_pw = generate_password_hash(password)

    # 4. Create user
    new_user = Users(email=email, password_hash=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    # 1. Validate input
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # 2. Find user
    user = Users.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    # 3. Check password
    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # ✅ At this stage the user is authenticated.
    # Later you’ll generate and return a JWT or session token.
    return jsonify({
        "message": "Login successful",
        "user": {
            "user_id": str(user.user_id),
            "email": user.email,
        }
    }), 200