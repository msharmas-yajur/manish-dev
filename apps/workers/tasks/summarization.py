import os
import httpx
import structlog
from celery_app import app

logger = structlog.get_logger()

LLM_SERVICE_URL = os.getenv('LLM_SERVICE_URL', 'http://llm-service:8003')


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def summarize_text(
    self,
    user_id: str,
    text: str,
    max_length: int = 500,
    style: str = 'concise'
):
    """
    Summarize a text document.

    Args:
        user_id: User ID for API key lookup
        text: Text to summarize
        max_length: Maximum length of summary in words
        style: Summary style ('concise', 'detailed', 'bullet_points')

    Returns:
        Summary text
    """
    try:
        logger.info(f"Summarizing text ({len(text)} chars, style: {style})")

        style_prompts = {
            'concise': f"Summarize the following text in approximately {max_length} words. Be concise and focus on key points.",
            'detailed': f"Provide a detailed summary of the following text in approximately {max_length} words. Include important details and context.",
            'bullet_points': f"Summarize the following text as bullet points, with no more than {max_length // 10} bullet points. Focus on key takeaways.",
        }

        system_prompt = style_prompts.get(style, style_prompts['concise'])

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LLM_SERVICE_URL}/v1/chat/completions",
                json={
                    "model": "gpt-4o-mini",  # Use efficient model for summarization
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": text},
                    ],
                    "user_id": user_id,
                    "pipeline": "summarization",
                    "temperature": 0.3,
                    "max_tokens": max_length * 2,
                },
                headers={"X-User-Id": user_id},
            )
            response.raise_for_status()
            data = response.json()

        summary = data['choices'][0]['message']['content']
        logger.info(f"Successfully generated summary ({len(summary)} chars)")

        return {
            "success": True,
            "summary": summary,
            "model": data.get('model'),
            "usage": data.get('usage'),
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error in summarization: {e}")
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Error in summarization: {e}")
        raise self.retry(exc=e)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def summarize_clinical_note(self, user_id: str, clinical_note: str):
    """
    Summarize a clinical note with healthcare-specific formatting.

    Args:
        user_id: User ID for API key lookup
        clinical_note: Clinical note text

    Returns:
        Structured clinical summary
    """
    try:
        logger.info(f"Summarizing clinical note ({len(clinical_note)} chars)")

        system_prompt = """You are a medical documentation assistant. Summarize the following clinical note into a structured format:

1. **Chief Complaint**: Main reason for visit
2. **History of Present Illness**: Brief summary
3. **Assessment**: Key findings and diagnoses
4. **Plan**: Treatment plan and follow-up

Be accurate and concise. Do not add information not present in the original note."""

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LLM_SERVICE_URL}/v1/chat/completions",
                json={
                    "model": "gpt-4o",  # Use more capable model for clinical notes
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": clinical_note},
                    ],
                    "user_id": user_id,
                    "pipeline": "clinical_notes",
                    "temperature": 0.2,
                    "max_tokens": 1000,
                },
                headers={"X-User-Id": user_id},
            )
            response.raise_for_status()
            data = response.json()

        summary = data['choices'][0]['message']['content']
        logger.info("Successfully generated clinical summary")

        return {
            "success": True,
            "summary": summary,
            "model": data.get('model'),
            "usage": data.get('usage'),
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error in clinical summarization: {e}")
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Error in clinical summarization: {e}")
        raise self.retry(exc=e)
