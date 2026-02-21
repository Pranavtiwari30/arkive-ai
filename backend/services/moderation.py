import re

# List of harmful keywords to flag
HARMFUL_PATTERNS = [
    r'\b(bomb|explosive|weapon|kill|murder|suicide|hack|malware|virus)\b',
    r'\b(drugs|cocaine|heroin|meth)\b',
    r'\b(racist|hate speech|slur)\b',
]

FLAGGED_RESPONSES = {
    "violence": "This query contains violent or harmful content.",
    "drugs": "This query references illegal substances.",
    "hate": "This query contains potentially hateful content.",
}

def moderate_query(query: str) -> dict:
    """
    Checks if a query contains harmful content.
    Returns: { "is_flagged": bool, "reason": str or None }
    """
    query_lower = query.lower()

    # Check against harmful patterns
    if re.search(HARMFUL_PATTERNS[0], query_lower):
        return {"is_flagged": True, "reason": "violence/harmful content detected"}
    
    if re.search(HARMFUL_PATTERNS[1], query_lower):
        return {"is_flagged": True, "reason": "illegal substances detected"}
    
    if re.search(HARMFUL_PATTERNS[2], query_lower):
        return {"is_flagged": True, "reason": "hate speech detected"}

    return {"is_flagged": False, "reason": None}