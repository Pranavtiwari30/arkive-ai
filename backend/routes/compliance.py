from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from services.ingestion import ingest_document, SUPPORTED_EXTENSIONS
from services.embeddings import add_chunks_to_vector_store, retrieve_relevant_chunks
from services.audit import log_event
from services.model_router import routed_chat
from services.groq_client import GroqServiceError
from services.logger import get_logger
from db.mongo import documents_col
from middleware.auth import get_current_user
from pydantic import BaseModel, ValidationError
from typing import List, Optional
import os, shutil, json, re

log = get_logger(__name__)
router = APIRouter()

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

class PillarComplianceItem(BaseModel):
    pillar_id: str
    pillar_name: str
    status: str
    standards_referenced: List[str] = []
    finding: str
    gap_description: Optional[str] = None
    recommendation: Optional[str] = None
    confidence: float

class ComplianceCheckResult(BaseModel):
    compliance_score: int
    overall_status: str
    pillars: List[PillarComplianceItem]

COMPLIANCE_SYSTEM_PROMPT = """You are an AI compliance auditor. Analyse the policy document excerpt and determine compliance against 8 ethical AI pillars.

You must respond with valid JSON only. No markdown. No preamble. No explanation outside the JSON structure. Your entire response must parse as valid JSON matching the schema provided:

{
  "compliance_score": "integer (0–8, number of PASS pillars)",
  "overall_status": "COMPLIANT | PARTIAL | NON_COMPLIANT",
  "pillars": [
    {
      "pillar_id": "string (e.g., P01)",
      "pillar_name": "string (e.g., Transparency)",
      "status": "PASS | GAP",
      "standards_referenced": ["string"],
      "finding": "string (1–2 sentences, what was found in the document)",
      "gap_description": "string | null (what is missing — null if PASS)",
      "recommendation": "string | null (specific action to close gap — null if PASS)",
      "confidence": "float (0.0–1.0)"
    }
  ]
}

Pillars to check:
1. Transparency: Does this policy address how AI decisions are explained or made transparent to users?
2. Human Oversight: Does this policy describe human review, oversight, or control mechanisms for AI systems?
3. Privacy & Data Protection: Does this policy address how user data and personal information is protected?
4. Fairness & Non-discrimination: Does this policy address bias, fairness, or non-discrimination in AI outputs?
5. Accountability: Does this policy define who is responsible when the AI system causes harm or makes errors?
6. Safety & Security: Does this policy address risk management, safety testing, or security measures for the AI system?
7. Sustainability: Does this policy address environmental impact or sustainability of AI operations?
8. Inclusivity: Does this policy address accessibility, inclusion, or consideration of marginalized groups?
"""

def evaluate_compliance(doc_chunks: list, jurisdiction_context: str = None, retry: bool = False) -> dict:
    context = ""
    for i, chunk in enumerate(doc_chunks[:6]):
        context += f"\n[Section {i+1}]\n{chunk['text']}\n"
        
    prompt = f"Policy Document Excerpt:\n{context}"
    if jurisdiction_context:
        prompt += f"\nJurisdiction Onboarding Context: {jurisdiction_context}"
    
    try:
        response = routed_chat(
            query=prompt,
            task_type="pillar_analysis",
            messages=[
                {"role": "system", "content": COMPLIANCE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        raw_cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        raw_cleaned = re.sub(r"\s*```$", "", raw_cleaned)
        
        parsed_json = json.loads(raw_cleaned)
        
        # Enforce validation using Pydantic model
        validated_model = ComplianceCheckResult(**parsed_json)
        return validated_model.dict()
        
    except (json.JSONDecodeError, ValidationError, GroqServiceError, Exception) as e:
        if not retry:
            return evaluate_compliance(doc_chunks, jurisdiction_context, retry=True)
        log.error("compliance_check_error", extra={"error": str(e)})
        
        # Safe structural fallback adhering to ComplianceCheckResult schema
        fallback = ComplianceCheckResult(
            compliance_score=0,
            overall_status="NON_COMPLIANT",
            pillars=[
                PillarComplianceItem(
                    pillar_id=f"P0{idx+1}",
                    pillar_name=p["label"],
                    status="GAP",
                    standards_referenced=[],
                    finding="Structural validation or JSON parsing of compliance audit failed.",
                    gap_description=f"Parsing error: {str(e)}",
                    recommendation="Re-run the audit checking your connection and try again.",
                    confidence=0.0
                ) for idx, p in enumerate(PILLARS)
            ]
        )
        return fallback.dict()


import uuid
from datetime import datetime, timezone

@router.post("/check")
async def compliance_check(
    file: UploadFile = File(...),
    password: str = Form(None),
    user: dict = Depends(get_current_user)
):

    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Accepted formats: {supported}."
        )

    user_id = user["user_id"]
    # Preserve original extension so ingestion routes correctly
    temp_path = f"uploads/temp_{file.filename}"
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        try:
            chunk_data, doc_id = ingest_document(
                temp_path,
                uploaded_by=user_id,
                is_permanent=False,
                password=password
            )
        except ValueError as e:
            raise HTTPException(status_code=403, detail=str(e))

        add_chunks_to_vector_store(chunk_data, doc_id)
        doc_chunks = [c for c in chunk_data]

        try:
            report_data = evaluate_compliance(doc_chunks)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to generate compliance report.")

        report_data["report_id"] = str(uuid.uuid4())
        report_data["generated_at"] = datetime.now(timezone.utc).isoformat()
        report_data["document_name"] = file.filename
        report_data["document_id"] = doc_id

        log_event("compliance_check", user_id, {
            "filename": file.filename,
            "score": report_data.get("compliance_score", 0),
            "report_id": report_data["report_id"]
        })

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return report_data

    except Exception as e:
        raise e
    finally:
        # Always clean up temp file — critical for Render 512MB disk limit
        if os.path.exists(temp_path):
            os.remove(temp_path)