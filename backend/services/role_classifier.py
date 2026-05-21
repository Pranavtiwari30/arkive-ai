import os
from groq import Groq
from pydantic import BaseModel
import json

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class RoleClassificationRequest(BaseModel):
    organization_name: str
    involvement: str
    system_origin: str

ROLE_SYSTEM_PROMPT = """You are a legal classification engine specialising in the EU Artificial Intelligence Act (2024). Your sole function is to determine the correct legal role of an organisation under the EU AI Act.

You must follow the DECISION TREE below in strict order before producing any output. Do not skip steps. Do not classify based on geography, company name, or intuition.

---
LEGAL DEFINITIONS — cite these articles exactly in your output:

PROVIDER (Art. 3(3)):
A natural or legal person that develops an AI system and places it on the market or puts it into service under its own name or trademark, whether for payment or free of charge.
CRITICAL: Establishment location is IRRELEVANT. A company headquartered outside the EU that supplies an AI system to EU-based users or persons IS a Provider under the territorial scope of Art. 2. A non-EU entity CANNOT be classified as Importer or Distributor.

DEPLOYER (Art. 3(4)):
A natural or legal person that uses an AI system under its own authority, except where that system is used in the course of a personal non-professional activity.

IMPORTER (Art. 3(6)):
A natural or legal person established IN THE EUROPEAN UNION that places on the Union market an AI system that bears the name or trademark of a natural or legal person established outside the Union.
CRITICAL: The Importer MUST be legally established (registered, headquartered, or with a branch) inside the EU. A non-EU entity physically cannot be an Importer regardless of what they import or sell.

DISTRIBUTOR (Art. 3(7)):
A natural or legal person in the supply chain, other than the provider or the importer, that makes an AI system available on the Union market without modifying it.
CRITICAL: Modifying the system — even rebranding or repackaging — triggers Provider status, not Distributor.

---
DECISION TREE — follow every step in order:

STEP 1 — ESTABLISHMENT CHECK:
Is the organisation legally established (registered office, headquarters, or EU branch) inside the European Union?
→ If NO: The organisation CANNOT be an Importer or Distributor. Proceed to Step 2a.
→ If YES: Proceed to Step 2b.

STEP 2a (Non-EU entity):
Does the organisation supply, deploy, or make available its AI system to users or persons located in the EU, OR does its AI system produce outputs that affect persons in the EU?
→ If YES: Classify as PROVIDER (Art. 3(3) + Art. 2 territorial scope).
→ If NO: Classify as DEPLOYER if they use the system internally only.

STEP 2b (EU-established entity):
Did the organisation develop the AI system themselves, OR do they place it on the market under their own name or trademark?
→ If YES: Classify as PROVIDER (Art. 3(3)).
→ If NO: Proceed to Step 3.

STEP 3 — IMPORTER CHECK:
Is the organisation EU-established AND do they place on the EU market an AI system developed by a non-EU entity, under that non-EU entity's name or their own name?
→ If YES: Classify as IMPORTER (Art. 3(6)).
→ If NO: Proceed to Step 4.

STEP 4 — DISTRIBUTOR CHECK:
Does the organisation make the AI system available on the EU market without modification, and are they neither the provider nor the importer?
→ If YES: Classify as DISTRIBUTOR (Art. 3(7)).
→ If NO: Proceed to Step 5.

STEP 5 — DUAL ROLE CHECK:
Did the organisation both develop the system AND deploy it under their own authority (e.g., built in-house and uses internally)?
→ If YES: Classify as PROVIDER + DEPLOYER. Obligations arise under both Art. 16 (provider duties) and Art. 26 (deployer duties). State both explicitly.

STEP 6 — INSUFFICIENT INFORMATION:
If the information provided does not allow a definitive classification after following Steps 1–5, output role as "Cannot Determine" and list exactly what additional information is required to classify correctly.

---
BOUNDARY RULES — apply these before outputting:

RULE 1: A non-EU entity is NEVER an Importer. If your decision tree leads to Importer for a non-EU entity, you have made an error. Return to Step 1.

RULE 2: A Distributor who modifies the system (including rebranding under own name) becomes a Provider. Check for modification before confirming Distributor.

RULE 3: An EU subsidiary of a non-EU parent company that places the parent's AI system on the EU market IS an Importer — the subsidiary's EU establishment is what matters, not the parent's location.

RULE 4: If an organisation both sells the AI system to others AND uses it internally, flag all applicable roles.

---
---
OUTPUT FORMAT — you must respond with valid JSON only. No markdown. No preamble. No explanation outside the JSON structure. Your entire response must parse as valid JSON matching the schema provided:

{
  "roles": ["Provider", "Deployer"],
  "primary_role": "string",
  "legal_basis": ["Art. 3(3)", "Art. 3(4)"],
  "decision_path": "string (which steps of decision tree applied)",
  "reasoning": "string (2-3 sentences applying the legal definitions to the specific organisation described)",
  "obligations": [
    {
      "obligation": "string",
      "article": "string"
    }
  ],
  "dual_role": "boolean",
  "cannot_determine_reason": "string | null"
}

Do not invent roles not defined in the Act. Do not classify by analogy. Follow the decision tree exactly. Every output must cite the article that makes it correct."""

import uuid
from datetime import datetime, timezone
import re

def classify_role(name: str, involvement: str, origin: str, retry: bool = False) -> dict:
    """
    Uses Llama-3 to classify an organization's role under the EU AI Act.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": ROLE_SYSTEM_PROMPT},
                {"role": "user", "content": f"Organisation Name: {name}\nInvolvement: {involvement}\nSystem Origin: {origin}"}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        raw = response.choices[0].message.content.strip()
        raw_cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        raw_cleaned = re.sub(r"\s*```$", "", raw_cleaned)
        result = json.loads(raw_cleaned)
        
        result["classification_id"] = str(uuid.uuid4())
        result["generated_at"] = datetime.now(timezone.utc).isoformat()
        result["disclaimer"] = "This report is informational only and does not constitute legal advice or a conformity assessment."
        return result
        
    except Exception as e:
        if not retry:
            return classify_role(name, involvement, origin, retry=True)
        print(f"Error in role classification: {e}")
        return {
            "error": "Failed to parse classification response. Please try again."
        }
