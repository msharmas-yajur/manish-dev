from .health import router as health_router
from .chat import router as chat_router
from .embeddings import router as embeddings_router
from .models import router as models_router
from .providers import router as providers_router

__all__ = [
    'health_router',
    'chat_router',
    'embeddings_router',
    'models_router',
    'providers_router',
]
