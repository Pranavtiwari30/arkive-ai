from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def moderate_query(query: str) -> dict:
    """
    Uses Meta's Llama Guard 3 to detect harmful content.
    Much more intelligent than keyword matching.
    """
    try:
        response = client.chat.completions.create(
            model="llama-guard-3-8b",
            messages=[
                {
                    "role": "user",
                    "content": query
                }
            ],
            max_tokens=10
        )

        result = response.choices[0].message.content.strip().lower()
        print(f"🛡️ Llama Guard result: {result}")

        if result.startswith("unsafe"):
            # Extract category if available e.g. "unsafe\ns6"
            category = result.split("\n")[1].strip() if "\n" in result else "unsafe content"
            return {
                "is_flagged": True,
                "reason": f"Content policy violation detected ({category})"
            }

        return {"is_flagged": False, "reason": None}

    except Exception as e:
        print(f"⚠️ Moderation error: {e}")
        # Fail safe — if moderation errors, allow through but log it
        return {"is_flagged": False, "reason": None}