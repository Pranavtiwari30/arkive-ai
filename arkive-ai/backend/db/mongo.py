from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["arkive_db"]

users_col = db["users"]
sessions_col = db["sessions"]
messages_col = db["messages"]
documents_col = db["documents"]
audit_logs_col = db["audit_logs"]

# Simple TTL index — MongoDB will handle cleanup
try:
    documents_col.create_index(
        "uploaded_at",
        expireAfterSeconds=604800  # 7 days
    )
except:
    pass

print("✅ MongoDB Connected!")