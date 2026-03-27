from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# 🚨 Layer 1: Fast keyword-based filter
BLOCKED_KEYWORDS = [
    "hack", "exploit", "bypass", "attack",
    "bomb", "weapon", "kill", "fraud",
    "steal", "illegal", "drugs"
]

def keyword_check(query: str):
    """
    Simple rule-based filter for obvious harmful content.
    """
    q = query.lower()
    for word in BLOCKED_KEYWORDS:
        if word in q:
            return True, f"keyword detected: {word}"
    return False, None


def moderate_query(query: str) -> dict:
    """
    Hybrid moderation system:
    1. Keyword filter (fast)
    2. LLM-based classification (Llama 3)

    Returns:
    {
        "is_flagged": bool,
        "reason": str | None
    }
    """

    # 🔹 Layer 1: Keyword-based filtering
    flagged, reason = keyword_check(query)
    if flagged:
        print(f"🛡️ Keyword moderation triggered: {reason}")
        return {
            "is_flagged": True,
            "reason": f"Blocked by keyword filter ({reason})"
        }

    # 🔹 Layer 2: LLM-based moderation
    try:
        response = client.chat.completions.create(
            model="llama3-8b-8192",  # ✅ stable Groq model
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict AI safety classifier.\n"
                        "Classify the user input into ONLY one of the following:\n\n"
                        "SAFE\n"
                        "UNSAFE: <category>\n\n"
                        "Categories: violence, hacking, illegal, harmful, abuse\n"
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
        print(f"🛡️ LLM moderation result: {result}")

        # 🔍 Flexible unsafe detection (more robust than startswith)
        if "unsafe" in result:
            reason = result.split(":")[-1].strip() if ":" in result else "unsafe content"
            return {
                "is_flagged": True,
                "reason": reason
            }

        return {"is_flagged": False, "reason": None}

    except Exception as e:
        print(f"⚠️ Moderation fallback (LLM failed): {e}")

        # ⚠️ Fail-safe: allow request but log it
        return {"is_flagged": False, "reason": None}