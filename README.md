# 🗂️ Arkive AI

An ethical AI chat history management platform that uses RAG (Retrieval-Augmented Generation) to provide grounded, explainable responses from your documents.

## ✨ Features

- 📄 **Document Upload** — Upload PDFs and build a knowledge base
- 🧠 **Semantic Search** — Find relevant content using vector embeddings
- 🤖 **RAG Pipeline** — LLM answers grounded in your documents
- 📚 **Source Citations** — Every answer shows which sources were used
- 🚩 **Content Moderation** — Harmful queries are flagged automatically
- 📝 **Audit Logging** — Full traceability of all interactions
- 🎨 **Professional UI** — Clean dark-themed React frontend

## 🛠️ Tech Stack

| Layer      | Technology            |
| ---------- | --------------------- |
| Frontend   | React + Vite          |
| Backend    | FastAPI               |
| LLM        | Groq (Llama 3.3 70B)  |
| Embeddings | Sentence Transformers |
| Vector DB  | ChromaDB              |
| Database   | MongoDB Atlas         |
| RAG        | LangChain             |

## 🚀 Setup

### 1. Clone the repo

```bash
git clone https://github.com/Pranavtiwari30/arkive-ai.git
cd arkive-ai
```

### 2. Backend setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your MONGO_URI and GROQ_API_KEY in .env
uvicorn main:app --reload
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Visit 👉 http://localhost:5173

## 📁 Project Structure

```
arkive-ai/
├── backend/
│   ├── db/          # MongoDB connection
│   ├── routes/      # API endpoints
│   ├── services/    # RAG, embeddings, moderation, audit
│   └── main.py      # FastAPI app
└── frontend/
    └── src/
        └── components/  # React UI components
```

## 🔒 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

## 📌 Project Info

- **Type:** Minor Project
- **Category:** Product
- **Institution:** SRM University
