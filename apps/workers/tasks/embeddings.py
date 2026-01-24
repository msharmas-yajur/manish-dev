import os
import httpx
import structlog
from celery_app import app

logger = structlog.get_logger()

LLM_SERVICE_URL = os.getenv('LLM_SERVICE_URL', 'http://llm-service:8003')


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_embeddings(self, user_id: str, texts: list[str], model: str = 'text-embedding-3-small'):
    """
    Generate embeddings for a list of texts.

    Args:
        user_id: User ID for API key lookup
        texts: List of texts to generate embeddings for
        model: Embedding model to use

    Returns:
        List of embeddings
    """
    try:
        logger.info(f"Generating embeddings for {len(texts)} texts")

        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{LLM_SERVICE_URL}/v1/embeddings",
                json={
                    "model": model,
                    "input": texts,
                    "user_id": user_id,
                },
                headers={"X-User-Id": user_id},
            )
            response.raise_for_status()
            data = response.json()

        embeddings = [item['embedding'] for item in data.get('data', [])]
        logger.info(f"Successfully generated {len(embeddings)} embeddings")

        return {
            "success": True,
            "embeddings": embeddings,
            "model": data.get('model'),
            "usage": data.get('usage'),
        }

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error generating embeddings: {e}")
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise self.retry(exc=e)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def batch_embed_documents(self, user_id: str, documents: list[dict], batch_size: int = 10):
    """
    Generate embeddings for a batch of documents.

    Args:
        user_id: User ID for API key lookup
        documents: List of documents with 'id' and 'content' fields
        batch_size: Number of documents to process at once

    Returns:
        List of document IDs with their embeddings
    """
    try:
        logger.info(f"Batch embedding {len(documents)} documents")
        results = []

        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            texts = [doc['content'] for doc in batch]
            ids = [doc['id'] for doc in batch]

            # Generate embeddings for this batch
            embedding_result = generate_embeddings.delay(user_id, texts).get(timeout=120)

            if embedding_result.get('success'):
                for doc_id, embedding in zip(ids, embedding_result.get('embeddings', [])):
                    results.append({
                        'id': doc_id,
                        'embedding': embedding,
                    })

        logger.info(f"Successfully embedded {len(results)} documents")
        return {"success": True, "results": results}

    except Exception as e:
        logger.error(f"Error in batch embedding: {e}")
        raise self.retry(exc=e)
