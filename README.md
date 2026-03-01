# Arkive AI

**AI Compliance Intelligence Platform**

Arkive AI helps organisations verify their AI systems and policies against international standards — UNESCO AI Ethics, OECD AI Principles, and the EU AI Act. Built on a production-grade RAG pipeline with semantic search, content moderation, and full audit traceability.

Live at: https://arkive-ai.vercel.app

---

## What it does

Most organisations deploying AI have no simple way to check if their practices comply with international governance standards. Arkive AI solves this — upload your AI policy document and get a structured compliance report in seconds, with exact article citations and gap recommendations.

The EU AI Act enforcement deadline is August 2026. Companies need to be compliant. Arkive AI makes that accessible.

---

## Features

**Compliance Check**
- Upload any AI policy PDF
- Checks against 8 compliance pillars derived from UNESCO, OECD, and EU AI Act
- Returns PASS/GAP results with exact article citations
- Identifies gaps with specific recommendations
- Compliance score out of 8

**AI Compliance Chat**
- Ask anything about UNESCO AI Ethics, OECD Principles, or EU AI Act
- Answers grounded in verified source documents — no hallucinations
- Every answer shows source document, page number, and confidence score
- Session history persisted across logins

**Governance Infrastructure**
- Content moderation via Meta Llama Guard 3
- Full audit log of every interaction with timestamps
- Permanent knowledge base — 3 core documents indexed forever
- User document uploads with automatic 7-day expiry

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| LLM | Groq — Llama 3.3 70B |
| Moderation | Llama Guard 3 via Groq |
| Embeddings | Sentence Transformers all-MiniLM-L6-v2 |
| Vector Search | MongoDB Atlas Vector Search |
| Database | MongoDB Atlas |
| RAG Framework | LangChain |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Architecture

```
User Query / Policy Document
         ↓
Llama Guard 3 — Content Moderation
         ↓
MongoDB Atlas Vector Search — Semantic Retrieval
         ↓
Context + Permanent Knowledge Base
(UNESCO AI Ethics · OECD Principles · EU AI Act)
         ↓
Groq LLM — Grounded Answer / Compliance Analysis
         ↓
Response + Sources + Confidence Score + Audit Log
```

---

## Knowledge Base

Three permanent documents are indexed at startup and never deleted:

| Document | Source | Chunks |
|---|---|---|
| UNESCO Recommendation on AI Ethics | UNESCO, 2021 | 243 |
| OECD AI Principles | OECD, 2019 | 140 |
| EU AI Act | European Parliament, 2024 | 1,398 |

---

## Compliance Pillars

The compliance check evaluates 8 pillars with exact article citations:

| Pillar | Standards Referenced |
|---|---|
| Transparency | UNESCO Art. 21 · OECD 1.2 |
| Human Oversight | EU AI Act Art. 14 · OECD 1.4 |
| Privacy & Data Protection | EU AI Act Art. 10 · UNESCO Art. 22 |
| Fairness & Non-discrimination | UNESCO Art. 23 · OECD 1.3 |
| Accountability | EU AI Act Art. 16 · OECD 1.5 |
| Safety & Security | EU AI Act Art. 9 · UNESCO Art. 24 |
| Sustainability | UNESCO Art. 25 · OECD 1.1 |
| Inclusivity | UNESCO Art. 26 · OECD 1.3 |

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Groq API key (free)

### 1. Clone

```bash
git clone https://github.com/Pranavtiwari30/arkive-ai.git
cd arkive-ai
```

### 2. Backend

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

On startup the server automatically indexes the 3 knowledge base PDFs from `backend/uploads/` if not already present in MongoDB.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. MongoDB Atlas Vector Search Index

Create a vector search index on the `embeddings` collection:

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

### 5. Network Access

In MongoDB Atlas → Network Access → Add `0.0.0.0/0` to allow connections from your deployment platform.

---

## Project Structure

```
arkive-ai/
├── backend/
│   ├── db/
│   │   └── mongo.py              # MongoDB connection + TTL indexes
│   ├── routes/
│   │   ├── chat.py               # Chat + session endpoints
│   │   ├── documents.py          # Document upload endpoint
│   │   ├── audit.py              # Audit log endpoint
│   │   └── compliance.py         # Compliance check endpoint
│   ├── services/
│   │   ├── rag.py                # RAG pipeline
│   │   ├── embeddings.py         # MongoDB Atlas Vector Search
│   │   ├── ingestion.py          # PDF chunking + metadata
│   │   ├── moderation.py         # Llama Guard moderation
│   │   ├── audit.py              # Audit logging
│   │   └── preload.py            # Startup knowledge base indexing
│   ├── uploads/
│   │   ├── unesco-ai.pdf         # Permanent knowledge base
│   │   ├── oecd.pdf              # Permanent knowledge base
│   │   └── eu-ai-act.pdf         # Permanent knowledge base
│   └── main.py                   # FastAPI app + lifespan
└── frontend/
    └── src/
        └── components/
            ├── Login.jsx          # Split screen login
            ├── Sidebar.jsx        # Navigation with SVG icons
            ├── Chat.jsx           # Compliance chat interface
            ├── ComplianceCheck.jsx # Policy upload + report
            ├── Documents.jsx      # Knowledge base viewer
            └── AuditLogs.jsx      # Audit log viewer
```

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://arkive-ai.vercel.app |
| Backend | Render | https://arkive-ai-backend.onrender.com |
| Database | MongoDB Atlas | Cloud — free tier |

Note: Render free tier spins down after inactivity. First request after sleep takes ~60 seconds to wake up.

---

## Ethical AI Governance

Arkive AI is itself built around the principles it enforces:

- **Transparency** — Every answer cites its source document and page number
- **Accountability** — All interactions are audit logged with user ID and timestamp
- **Moderation** — Llama Guard 3 filters harmful content before it reaches the LLM
- **Grounding** — All responses based on verified international standards documents
- **Explainability** — Confidence scores show how well-grounded each answer is
- **Traceability** — Compliance reports include exact article references

---

## Project Info

| Field | Detail |
|---|---|
| Type | Minor Project |
| Category | AI Governance Tooling |
| Institution | SRM University |
| SDG Alignment | SDG 16 — Peace, Justice and Strong Institutions |
| EU AI Act Deadline | August 2026 |

**References**
- UNESCO Recommendation on the Ethics of Artificial Intelligence (2021)
- OECD Principles on Artificial Intelligence (2019)
- EU Artificial Intelligence Act (2024)
