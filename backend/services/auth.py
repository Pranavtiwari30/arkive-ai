import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from db.mongo import users_col
from bson import ObjectId
import os

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("ENV") == "production":
        raise RuntimeError("JWT_SECRET_KEY must be set in production")
    SECRET_KEY = "arkive-ai-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns the payload or raises JWTError."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def register_user(email: str, password: str, display_name: str, organisation: str = None) -> dict:
    """
    Register a new user. Returns the user document or raises ValueError if email exists.
    """
    # Check if user already exists
    existing = users_col.find_one({"email": email.lower()})
    if existing:
        raise ValueError("An account with this email already exists.")

    user_doc = {
        "email": email.lower(),
        "password_hash": hash_password(password),
        "display_name": display_name,
        "organisation": organisation,
        "created_at": datetime.utcnow(),
        "last_login": None
    }
    result = users_col.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc


def authenticate_user(email: str, password: str) -> dict:
    """
    Authenticate user by email and password. Returns user doc or None.
    """
    user = users_col.find_one({"email": email.lower()})
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None

    # Update last login
    users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    return user


def get_user_by_id(user_id: str) -> dict:
    """Fetch a user by their MongoDB ObjectId string."""
    try:
        user = users_col.find_one({"_id": ObjectId(user_id)})
        return user
    except Exception:
        return None
