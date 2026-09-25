import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from pymongo import MongoClient
from pydantic import BaseModel
import hashlib
import hmac

# Get database connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "lumen")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]
users_col = db["users"]
sessions_col = db["sessions"]

# Ensure index on email for uniqueness
try:
    users_col.create_index("email", unique=True)
except:
    pass

# Create index on session token
try:
    sessions_col.create_index("token", unique=True)
except:
    pass

SECRET_KEY = os.getenv("SECRET_KEY", "lumen-secret-key-change-in-production")


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class AuthResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    message: Optional[str] = None


def hash_password(password: str) -> str:
    """Hash password using PBKDF2"""
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${pwd_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, pwd_hash = stored_hash.split('$')
        pwd_hash_attempt = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return pwd_hash_attempt.hex() == pwd_hash
    except:
        return False


def create_session_token(email: str) -> str:
    """Create a session token for the user"""
    token = secrets.token_urlsafe(32)
    session_doc = {
        "token": token,
        "email": email,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "expiresAt": (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
    }
    sessions_col.insert_one(session_doc)
    return token


def verify_session_token(token: str) -> Optional[str]:
    """Verify session token and return email if valid"""
    session = sessions_col.find_one({
        "token": token,
        "expiresAt": {"$gt": datetime.utcnow().isoformat() + "Z"}
    })
    if session:
        return session.get("email")
    return None


def signup(email: str, password: str, name: str) -> AuthResponse:
    """Register a new user"""
    # Validate password strength
    if len(password) < 6:
        return AuthResponse(success=False, message="Password must be at least 6 characters")
    
    # Check if user already exists
    existing = users_col.find_one({"email": email})
    if existing:
        return AuthResponse(success=False, message="Email already registered")
    
    # Create new user
    user_doc = {
        "email": email,
        "name": name,
        "password": hash_password(password),
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    users_col.insert_one(user_doc)
    
    # Create session token
    token = create_session_token(email)
    
    return AuthResponse(
        success=True,
        token=token,
        email=email,
        name=name,
        message="Account created successfully"
    )


def login(email: str, password: str) -> AuthResponse:
    """Authenticate user"""
    user = users_col.find_one({"email": email})
    
    if not user:
        return AuthResponse(success=False, message="Invalid email or password")
    
    if not verify_password(password, user.get("password", "")):
        return AuthResponse(success=False, message="Invalid email or password")
    
    # Create session token
    token = create_session_token(email)
    
    return AuthResponse(
        success=True,
        token=token,
        email=email,
        name=user.get("name"),
        message="Login successful"
    )


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email"""
    user = users_col.find_one({"email": email})
    if user:
        # Don't return password hash
        user.pop("password", None)
        return user
    return None
