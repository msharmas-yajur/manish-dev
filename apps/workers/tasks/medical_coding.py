import os
import httpx
import structlog
from celery_app import app

logger = structlog.get_logger()

LLM_SERVICE_URL = os.getenv('LLM_SERVICE_URL', 'http://llm-service:8003')
SNOWSTORM_URL = os.getenv('SNOWSTORM_URL', 'http://snowstorm:8085')


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def suggest_snomed_codes(self, user_id: str, clinical_text: str, max_codes: int = 5):
    """
    Suggest SNOMED CT codes for clinical text.

    Args:
        user_id: User ID for API key lookup
        clinical_text: Clinical text to analyze
        max_codes: Maximum number of codes to suggest

    Returns:
        List of suggested SNOMED CT codes with descriptions
    """
    try:
        logger.info(f"Suggesting SNOMED codes for text ({len(clinical_text)} chars)")

        system_prompt = f"""You are a medical coding expert. Analyze the following clinical text and suggest the most appropriate SNOMED CT codes.

For each suggestion, provide:
1. The likely SNOMED CT concept (be specific)
2. A brief rationale for the suggestion

Provide up to {max_codes} suggestions, ordered by relevance. Format as:
- Concept: [description]
  Rationale: [brief explanation]"""

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LLM_SERVICE_URL}/v1/chat/completions",
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": clinical_text},
                    ],
                    "user_id": user_id,
                    "pipeline": "medical_coding",
                    "temperature": 0.2,
                    "max_tokens": 1000,
                },
                headers={"X-User-Id": user_id},
            )
            response.raise_for_status()
            data = response.json()

        suggestions = data['choices'][0]['message']['content']

        return {
            "success": True,
            "suggestions": suggestions,
            "model": data.get('model'),
            "usage": data.get('usage'),
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error in SNOMED suggestion: {e}")
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Error in SNOMED suggestion: {e}")
        raise self.retry(exc=e)


@app.task(bind=True, max_retries=3, default_retry_delay=30)
def search_snomed(self, term: str, limit: int = 10):
    """
    Search SNOMED CT via Snowstorm server.

    Args:
        term: Search term
        limit: Maximum number of results

    Returns:
        List of SNOMED CT concepts
    """
    try:
        logger.info(f"Searching SNOMED for: {term}")

        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{SNOWSTORM_URL}/MAIN/concepts",
                params={
                    "term": term,
                    "activeFilter": True,
                    "limit": limit,
                },
            )

            if response.status_code == 200:
                data = response.json()
                concepts = [
                    {
                        "conceptId": item.get("conceptId"),
                        "fsn": item.get("fsn", {}).get("term"),
                        "pt": item.get("pt", {}).get("term"),
                    }
                    for item in data.get("items", [])
                ]

                logger.info(f"Found {len(concepts)} SNOMED concepts")
                return {"success": True, "concepts": concepts}
            else:
                logger.warning(f"Snowstorm returned status {response.status_code}")
                return {"success": False, "error": "Snowstorm search failed", "concepts": []}

    except httpx.ConnectError:
        logger.warning("Snowstorm server not available")
        return {"success": False, "error": "Snowstorm server not available", "concepts": []}
    except Exception as e:
        logger.error(f"Error searching SNOMED: {e}")
        raise self.retry(exc=e)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def extract_medical_entities(self, user_id: str, clinical_text: str):
    """
    Extract medical entities from clinical text.

    Args:
        user_id: User ID for API key lookup
        clinical_text: Clinical text to analyze

    Returns:
        Extracted entities categorized by type
    """
    try:
        logger.info(f"Extracting medical entities from text ({len(clinical_text)} chars)")

        system_prompt = """You are a medical NLP expert. Extract and categorize medical entities from the following clinical text.

Categories to identify:
1. **Conditions/Diagnoses**: Medical conditions, diseases, symptoms
2. **Medications**: Drug names, dosages, frequencies
3. **Procedures**: Surgical procedures, tests, examinations
4. **Anatomy**: Body parts, organs, anatomical locations
5. **Lab Values**: Laboratory test results with values

For each entity, provide:
- Entity text (as it appears)
- Category
- Confidence (high/medium/low)

Format as JSON array."""

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LLM_SERVICE_URL}/v1/chat/completions",
                json={
                    "model": "gpt-4o",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": clinical_text},
                    ],
                    "user_id": user_id,
                    "pipeline": "extraction",
                    "temperature": 0.1,
                    "max_tokens": 2000,
                },
                headers={"X-User-Id": user_id},
            )
            response.raise_for_status()
            data = response.json()

        entities = data['choices'][0]['message']['content']

        return {
            "success": True,
            "entities": entities,
            "model": data.get('model'),
            "usage": data.get('usage'),
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error in entity extraction: {e}")
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Error in entity extraction: {e}")
        raise self.retry(exc=e)
