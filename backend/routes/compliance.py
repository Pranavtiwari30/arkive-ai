from fastapi import APIRouter, UploadFile, File, Form
from services.ingestion import ingest_document
from services.embeddings import add_chunks_to_vector_store, retrieve_relevant_chunks
from services.audit import log_event
from groq import Groq
from dotenv import load_dotenv
from db.mongo import documents_col
import os
import shutil
import json

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PILLARS = [
    {
        "key": "transparency",
        "label": "Transparency",
        "question": "Does this policy address how AI decisions are explained or made transparent to users?"
    },
    {
        "key": "human_oversight",
        "label": "Human Oversight",
        "question": "Does this policy describe human review, oversight, or control mechanisms for AI systems?"
    },
    {
        "key": "privacy",
        "label": "Privacy & Data Protection",
        "question": "Does this policy address how user data and personal information is protected?"
    },
    {
        "key": "fairness",
        "label": "Fairness & Non-discrimination",
        "question": "Does this policy address bias, fairness, or non-discrimination in AI outputs?"
    },
    {
        "key": "accountability",
        "label": "Accountability",
        "question": "Does this policy define who is responsible when the AI system causes harm or makes errors?"
    },
    {
        "key": "safety",
        "label": "Safety & Security",
        "question": "Does this policy address risk management, safety testing, or security measures for the AI system?"
    },
    {
        "key": "sustainability",
        "label": "Sustainability",
        "question": "Does this policy address environmental impact or sustainability of AI operations?"
    },
    {
        "key": "inclusivity",
        "label": "Inclusivity",
        "question": "Does this policy address accessibility, inclusion, or consideration of marginalized groups?"
    },
]


def check_pillar(pillar: dict, doc_chunks: list) -> dict:
    """Check a single compliance pillar against the document chunks."""

    # Build context from document chunks only
    context = ""
    for i, chunk in enumerate(doc_chunks[:6]):
        context += f"\n[Section {i+1}]\n{chunk['text']}\n"

    prompt = f"""You are an AI compliance auditor. Analyse the following policy document excerpt and determine if it addresses the compliance requirement below.

Compliance Requirement: {pillar['question']}

Policy Document Excerpt:
{context}

Respond ONLY with a valid JSON object in exactly this format with no extra text:
{{
  "status": "pass" or "fail",
  "note": "one sentence explanation of your finding"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=150
    )

    raw = response.choices[0].message.content.strip()

    try:
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return {
            "status": result.get("status", "fail"),
            "note": result.get("note", "")
        }
    except Exception:
        return {"status": "fail", "note": "Could not evaluate this pillar."}


@router.post("/check")
async def compliance_check(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    # Save uploaded file temporarily
    temp_path = f"uploads/temp_{file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        # Ingest document — NOT permanent, temporary check only
        chunk_data, doc_id = ingest_document(
            temp_path,
            uploaded_by=user_id,
            is_permanent=False
        )

        # Add to MongoDB for retrieval
        add_chunks_to_vector_store(chunk_data, doc_id)

        # Retrieve all chunks from this document for analysis
        doc_chunks = [c for c in chunk_data]

        # Check each pillar
        results = {}
        gaps = []

        for pillar in PILLARS:
            result = check_pillar(pillar, doc_chunks)
            results[pillar["key"]] = result
            if result["status"] == "fail":
                gaps.append(
                    f"Add a section on {pillar['label'].lower()} — {result['note']}"
                )

        pass_count = sum(1 for r in results.values() if r["status"] == "pass")

        # Audit log
        log_event("compliance_check", user_id, {
            "filename": file.filename,
            "score": f"{pass_count}/8",
            "gaps": len(gaps)
        })

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # Clean up temp doc from MongoDB
        documents_col.delete_one({"_id": __import__("bson").ObjectId(doc_id)})

        return {
            "filename": file.filename,
            "score": f"{pass_count}/8",
            "results": results,
            "gaps": gaps
        }

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e