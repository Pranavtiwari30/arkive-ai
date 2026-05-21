import os
from groq import Groq
from pydantic import BaseModel, ValidationError
from typing import List, Optional
import json
import uuid
from datetime import datetime, timezone
import re

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class RiskClassificationRequest(BaseModel):
    system_description: str
    intended_purpose: str
    data_used: str
    jurisdiction_context: Optional[str] = None

class ObligationItem(BaseModel):
    obligation: str
    article: str

class RiskClassificationResult(BaseModel):
    risk_tier: str
    legal_basis: str
    annex_iii_category: Optional[str] = None
    classification_procedure_step: int
    reasoning: str
    obligations: List[ObligationItem] = []
    cannot_determine_reason: Optional[str] = None
    classification_id: Optional[str] = None
    generated_at: Optional[str] = None
    disclaimer: Optional[str] = None

RISK_SYSTEM_PROMPT = """You are a legal risk classification engine specialising in the EU Artificial Intelligence Act (2024). Your sole function is to determine the correct risk tier of an AI system under the EU AI Act.

You must use the CLASSIFICATION PROCEDURE below in strict order. Do not skip steps. Do not infer risk tier from surface features of the system — apply the legal definitions.

---
TIER DEFINITIONS:

UNACCEPTABLE RISK — Art. 5 (PROHIBITED):
These systems are banned entirely. Narrow exceptions exist for law enforcement under strict conditions.
Prohibited grounds:
(a) Subliminal techniques below the threshold of consciousness that manipulate behaviour causing harm
(b) Exploitation of vulnerabilities of specific groups (age, disability) that distorts behaviour causing harm
(c) Social scoring by public authorities that leads to detrimental treatment of persons
(d) Real-time remote biometric identification in publicly accessible spaces for law enforcement purposes (narrow law enforcement exceptions apply)
(e) Biometric categorisation inferring sensitive attributes (race, political opinions, trade union membership, religious beliefs, sexual orientation) — NOTE: does not apply to labelling/filtering of lawfully acquired biometric datasets for law enforcement
(f) Emotion recognition in the workplace or educational institutions (narrow exceptions apply)
(g) AI-based predictive policing based solely on profiling without objective and verifiable facts

HIGH RISK — Annex III (select ONLY from this reference list):

CATEGORY 1 — Biometric systems:
  1a: Real-time remote biometric identification in publicly accessible spaces — law enforcement (narrow exceptions)
  1b: Post-remote biometric identification systems (exception: prosecution of serious criminal offences with judicial authorisation)
  1c: Biometric categorisation systems inferring sensitive attributes listed above

CATEGORY 2 — Critical infrastructure:
  2: AI in safety components of critical infrastructure — road traffic, water, gas, heating, electricity, digital infrastructure

CATEGORY 3 — Education and vocational training:
  3a: Determining access, admission, or assignment to educational and vocational training institutions
  3b: Evaluating learning outcomes, assessing students, monitoring and detecting prohibited behaviour (cheating)

CATEGORY 4 — Employment, workers management, access to self-employment:
  4a: Recruitment and selection — CV screening, ranking candidates, filtering job applications, evaluating candidates in interviews
  4b: Making or assisting decisions on promotion, termination, task allocation, monitoring or evaluation of performance and behaviour of persons in work-related contractual relationships
  *** IMPORTANT: Employee productivity monitoring, keystroke tracking, screen activity monitoring, behavioural analytics in the workplace = Category 4b. This is NOT biometric categorisation. ***

CATEGORY 5 — Access to essential private and public services:
  5a: Credit scoring and creditworthiness assessment for natural persons
  5b: Risk assessment and pricing for life and health insurance
  5c: Emergency services dispatch — evaluation and classification of calls
  5d: Eligibility assessment for public assistance benefits and services

CATEGORY 6 — Law enforcement:
  6a: Risk assessments for individual likelihood of becoming victim or perpetrating criminal offence
  6b: Polygraphs and similar tools to detect emotional or psychological states
  6c: Evaluation of reliability of evidence in criminal investigations
  6d: Prediction of occurrence or recurrence of criminal offence based on profiling
  6e: Profiling of natural persons in criminal investigations

CATEGORY 7 — Migration, asylum, border control:
  7a: Polygraphs and similar tools applied to natural persons
  7b: Assessment of risk posed by natural persons for irregular migration
  7c: Examination of asylum applications, visa applications, residence permit applications

CATEGORY 8 — Justice and democratic processes:
  8a: Assisting judicial authorities in researching and interpreting facts and law, and applying law to specific facts
  8b: AI used in alternative dispute resolution
  8c: Influencing the outcome of elections or referendums, or voting behaviour

LIMITED RISK — Art. 50:
Systems that interact directly with humans, generate synthetic content, or perform emotion recognition/biometric categorisation outside Annex III scope.
Transparency obligations apply: must disclose AI nature to users.
Examples: chatbots, AI-generated images/video/text in commercial contexts, emotion recognition outside workplace/education.

MINIMAL RISK — Art. 69:
All other AI systems not falling into the above categories.
Voluntary codes of conduct encouraged. No mandatory obligations under the Act.

---
CLASSIFICATION GUARDRAILS — apply before selecting any category:

GUARDRAIL 1: Biometric data means physiological or behavioural characteristics that allow unique identification — fingerprints, facial geometry, iris patterns, voice patterns, gait. Keystroke dynamics, mouse movements, screen activity, productivity metrics, and behavioural logs are NOT biometric data for purposes of Annex III Category 1. They fall under Category 4b if used in an employment context.

GUARDRAIL 2: You must select the Annex III category from the reference list above by exact ID (e.g., "4b"). Do not paraphrase category names. Do not invent categories not in the list.

GUARDRAIL 3: If the system does not clearly match any Annex III category, do NOT force-fit. Classify as Limited or Minimal Risk as appropriate. Overclassification (calling a minimal risk system high-risk) is a failure mode with real consequences.

GUARDRAIL 4: Classify based on the PRIMARY USE CASE and INTENDED PURPOSE. A system that incidentally processes data that appears in Annex III categories is not automatically high-risk — the primary function determines the classification.

GUARDRAIL 5: If the system matches both an Art. 5 prohibition AND an Annex III category, classify as Unacceptable Risk. Art. 5 takes precedence over Annex III.

GUARDRAIL 6: State the exact Annex III category ID selected BEFORE writing the reasoning. Do not reverse-engineer a category from the reasoning.

GUARDRAIL 7: Any AI system that is designed or intended to interact directly with natural persons (such as customer service chatbots, conversational agents, or virtual assistants) MUST be classified as LIMITED RISK under Art. 50 (Step 3). This is because they are subject to legal disclosure and transparency obligations under the Act, making them Limited Risk. Do not classify them as Minimal Risk.

---
CLASSIFICATION PROCEDURE — follow in order:

STEP 1: Does the system match any Art. 5 prohibition ground (a) through (g)?
→ If YES: Classify as UNACCEPTABLE RISK. Cite the specific Art. 5 ground. Stop.
→ If NO: Proceed to Step 2.

STEP 2: Does the system's primary function match any Annex III category (1a through 8c)?
→ If YES: Classify as HIGH RISK. State the exact category ID. Stop.
→ If NO: Proceed to Step 3.

STEP 3: Does the system interact directly with natural persons (e.g., chatbots, conversational interfaces, virtual assistants)? Does it generate synthetic content (e.g., AI-generated text, images, audio, video)? Does it perform emotion recognition or biometric categorisation outside Annex III scope?
→ If YES: Classify as LIMITED RISK. Cite Art. 50. Stop.
→ If NO: Proceed to Step 4.

STEP 4: Classify as MINIMAL RISK. Cite Art. 69.

---
OUTPUT FORMAT — you must respond with valid JSON only. No markdown. No preamble. No explanation outside the JSON structure. Your entire response must parse as valid JSON matching the schema provided:

{
  "risk_tier": "Unacceptable | High | Limited | Minimal | Cannot Determine",
  "legal_basis": "string (e.g., Art. 5(1)(d) | Annex III 4b)",
  "annex_iii_category": "string | null (e.g., '4b: monitoring/evaluation of performance' — null if not High Risk)",
  "classification_procedure_step": "integer (1-4, which step triggered the result)",
  "reasoning": "string (2-3 sentences applying the legal definitions to the specific system described)",
  "obligations": [
    {
      "obligation": "string",
      "article": "string"
    }
  ],
  "cannot_determine_reason": "string | null"
}

Do not classify by analogy. Do not infer risk from how dangerous the system sounds. Follow the classification procedure exactly. Every output must cite the article or Annex III entry that makes it correct."""

def classify_risk_tier(description: str, purpose: str, data: str, jurisdiction_context: str = None, retry: bool = False) -> dict:
    """
    Uses Llama-3 to classify an AI system into an EU AI Act Risk Tier with strict schema validation.
    """
    user_prompt = f"System Description: {description}\nIntended Purpose: {purpose}\nData Used: {data}"
    if jurisdiction_context:
        user_prompt += f"\nJurisdiction Onboarding Context: {jurisdiction_context}"

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RISK_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        raw = response.choices[0].message.content.strip()
        raw_cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        raw_cleaned = re.sub(r"\s*```$", "", raw_cleaned)
        
        parsed_json = json.loads(raw_cleaned)
        
        # Enforce validation using Pydantic model
        validated_model = RiskClassificationResult(**parsed_json)
        result = validated_model.dict()
        
        result["classification_id"] = str(uuid.uuid4())
        result["generated_at"] = datetime.now(timezone.utc).isoformat()
        result["disclaimer"] = "This report is informational only and does not constitute legal advice or a conformity assessment."
        return result
        
    except (json.JSONDecodeError, ValidationError, Exception) as e:
        if not retry:
            return classify_risk_tier(description, purpose, data, jurisdiction_context, retry=True)
        print(f"Error in risk classification: {e}")
        
        # Safe structural fallback adhering to RiskClassificationResult schema
        fallback = RiskClassificationResult(
            risk_tier="Cannot Determine",
            legal_basis="N/A",
            annex_iii_category=None,
            classification_procedure_step=0,
            reasoning="An error occurred during strict validation or structure parsing of the risk classification engine.",
            obligations=[],
            cannot_determine_reason=f"Failed to parse or validate structural output: {str(e)}",
            classification_id=str(uuid.uuid4()),
            generated_at=datetime.now(timezone.utc).isoformat(),
            disclaimer="This report is informational only and does not constitute legal advice or a conformity assessment."
        )
        return fallback.dict()

