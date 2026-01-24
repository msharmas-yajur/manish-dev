import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config.settings import settings


def _get_fernet_key() -> bytes:
    """Derive a Fernet key from the encryption key setting."""
    # Use PBKDF2 to derive a proper Fernet key from the encryption key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"llm_service_salt",  # Static salt (could be made configurable)
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.encryption_key.encode()))
    return key


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for storage."""
    fernet = Fernet(_get_fernet_key())
    encrypted = fernet.encrypt(api_key.encode())
    return encrypted.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key from storage."""
    fernet = Fernet(_get_fernet_key())
    decrypted = fernet.decrypt(encrypted_key.encode())
    return decrypted.decode()


def hash_api_key(api_key: str) -> str:
    """Create a hash of the API key for verification purposes."""
    return hashlib.sha256(api_key.encode()).hexdigest()[:16]
