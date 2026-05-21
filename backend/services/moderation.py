from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

BLOCKED_KEYWORDS = [
    "hack", "exploit", "bypass", "attack",
    "bomb", "weapon", "kill", "fraud",
    "steal", "illegal", "drugs"
]

def keyword_check(query: str):
    q = query.lower()
    for word in BLOCKED_KEYWORDS:
        if word in q:
            return True, f"keyword detected: {word}"
    return False, None


def moderate_query(query: str) -> dict:
    flagged, reason = keyword_check(query)
    if flagged:
        print(f"Keyword moderation triggered: {reason}")
        return {
            "is_flagged": True,
            "reason": f"Blocked by keyword filter ({reason})"
        }

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict AI safety classifier for an AI compliance platform.\n"
                        "The platform helps organisations check AI policies against regulations like the EU AI Act.\n"
                        "Users may legitimately ask about AI risks, compliance gaps, and governance challenges.\n\n"
                        "Classify the user input into ONLY one of the following:\n\n"
                        "SAFE\n"
                        "UNSAFE: <category>\n\n"
                        "Categories: violence, hacking, illegal, harmful, abuse\n\n"
                        "IMPORTANT: Questions about AI ethics, compliance, regulations, risk assessment, "
                        "and policy gaps are SAFE — they are the core purpose of this platform.\n"
                        "Only flag content that is genuinely harmful, violent, or illegal.\n"
                        "Do not explain. Output exactly one line."
                    )
                },
                {
                    "role": "user",
                    "content": query
                }
            ],
            temperature=0,
            max_tokens=20
        )

        result = response.choices[0].message.content.strip().lower()
        print(f"LLM moderation result: {result}")

        if "unsafe" in result:
            reason = result.split(":")[-1].strip() if ":" in result else "unsafe content"
            return {
                "is_flagged": True,
                "reason": reason
            }

        return {"is_flagged": False, "reason": None}

    except Exception as e:
        print(f"Moderation fallback (LLM failed): {e}")
        return {"is_flagged": False, "reason": None}