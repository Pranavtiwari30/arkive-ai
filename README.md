# 🗂️ Arkive AI

An ethical AI chat platform grounded in UNESCO & OECD AI principles. Arkive AI uses Retrieval-Augmented Generation (RAG) to provide explainable, source-cited answers from your documents — with built-in governance, moderation, and full audit traceability.

---

## ✨ Features

- 🧠 **RAG Pipeline** — Answers grounded in real documents, not hallucinations
- 📚 **Source Citations** — Every answer shows exactly which document and page was used
- 📌 **Permanent Knowledge Base** — UNESCO & OECD AI Ethics documents indexed forever
- ☁️ **Cloud Vector Search** — MongoDB Atlas Vector Search for persistent semantic retrieval
- 🛡️ **ML Moderation** — Meta's Llama Guard 3 filters harmful queries
- 📝 **Audit Logging** — Full traceability of every interaction
- 💬 **Session Persistence** — Chat history saved to MongoDB, survives restarts
- 👤 **Multi-user Login** — Sessions separated per user
- 📊 **Confidence Scoring** — Every answer shows how confident the AI is
- ⏳ **Smart Storage** — User documents auto-expire after 7 days, core docs stay permanent

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| LLM | Groq (Llama 3.3 70B) |
| Moderation | Llama Guard 3 (via Groq) |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| Vector Search | MongoDB Atlas Vector Search |
| Database | MongoDB Atlas |
| RAG Framework | LangChain |

---

## 🏗️ Architecture
```
User Query
    ↓
Llama Guard 3 (Moderation)
    ↓
MongoDB Atlas Vector Search (Semantic Retrieval)
    ↓
Context + UNESCO/OECD Knowledge Base
    ↓
Groq LLM (Grounded Answer Generation)
    ↓
Response + Sources + Confidence Score + Audit Log
```

---

## 🚀 Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier)
- Groq API key (free)

### 1. Clone the repo
```bash
git clone https://github.com/Pranavtiwari30/arkive-ai.git
cd arkive-ai
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:
```
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```
```bash
uvicorn main:app --reload
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. MongoDB Atlas Vector Search Index

Create a vector search index on the `embeddings` collection with this config:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

### 5. Open the app
Visit 👉 http://localhost:5173

---

## 📁 Project Structure
```
arkive-ai/
├── backend/
│   ├── db/
│   │   └── mongo.py          # MongoDB connection + TTL indexes
│   ├── routes/
│   │   ├── chat.py           # Chat + session endpoints
│   │   ├── documents.py      # Document upload endpoint
│   │   └── audit.py          # Audit log endpoint
│   ├── services/
│   │   ├── rag.py            # RAG pipeline
│   │   ├── embeddings.py     # Vector store (MongoDB Atlas)
│   │   ├── ingestion.py      # PDF chunking
│   │   ├── moderation.py     # Llama Guard moderation
│   │   └── audit.py          # Audit logging
│   └── main.py               # FastAPI app
└── frontend/
    └── src/
        └── components/
            ├── Chat.jsx       # Main chat interface
            ├── Documents.jsx  # Knowledge base viewer
            ├── AuditLogs.jsx  # Audit log viewer
            ├── Sidebar.jsx    # Navigation
            └── Login.jsx      # User login
```

---

## 🔒 Ethical AI Governance

Arkive AI is built around responsible AI principles:

- **Transparency** — Every answer cites its sources with page numbers
- **Accountability** — All interactions are audit logged with timestamps
- **Moderation** — Llama Guard 3 filters harmful content before it reaches the LLM
- **Grounding** — Responses based on UNESCO & OECD verified documents
- **Explainability** — Confidence scores show how well-grounded each answer is

---

## 📌 Project Info

- **Type:** Minor Project
- **Category:** Product
- **SDG Alignment:** SDG 16 — Peace, Justice and Strong Institutions
- **Institution:** SRM University
- **References:** UNESCO Recommendation on AI Ethics (2021), OECD AI Principles (2019)