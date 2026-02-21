from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["arkive_db"]

# Collections
users_col = db["users"]
sessions_col = db["sessions"]
messages_col = db["messages"]
documents_col = db["documents"]
audit_logs_col = db["audit_logs"]

print("✅ MongoDB Connected!")