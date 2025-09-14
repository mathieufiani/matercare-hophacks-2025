# src/routes/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from src.extensions import db
from src.models.users import Users
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if Users.query.filter_by(email=email).first():
        return jsonify({"error": "User already exists"}), 400

    new_user = Users(email=email, password_hash=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()

    # (optional) issue tokens immediately after registration
    identity = str(new_user.user_id)  # UUID -> str
    access_token = create_access_token(identity=identity, additional_claims={"email": new_user.email})
    refresh_token = create_refresh_token(identity=identity)

    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = Users.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    identity = str(user.user_id)
    access_token = create_access_token(identity=identity, additional_claims={"email": user.email})
    refresh_token = create_refresh_token(identity=identity)

    return jsonify({
        "message": "Login successful",
        "user": {"user_id": identity, "email": user.email},
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


# Use the refresh token to get a new access token
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    new_access = create_access_token(identity=user_id)
    return jsonify({"access_token": new_access}), 200


# Example protected route
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = Users.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user_id": str(user.user_id), "email": user.email}), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required(refresh=True)
def logout():
    jti = get_jwt()["jti"]   # unique token identifier
    # store jti in a blacklist table/redis
    return jsonify({"message": "Logged out"}), 200