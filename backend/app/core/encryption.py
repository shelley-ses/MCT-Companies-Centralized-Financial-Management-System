import base64
import json
import os
import logging
from cryptography.fernet import Fernet
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

def get_encryption_key() -> bytes:
    # Load .env if not already loaded
    from dotenv import load_dotenv
    load_dotenv()
    key = os.getenv("PAYLOAD_ENCRYPTION_KEY")
    if not key:
        secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("SUPABASE_KEY") or "mct-centralized-system-32byte-secret-key!!"
        key = base64.urlsafe_b64encode(secret.ljust(32)[:32].encode("utf-8")).decode("utf-8")
    if isinstance(key, str):
        key = key.encode("utf-8")
    return key



def encrypt_payload(data: dict) -> str:
    """
    Encrypt a dictionary payload into an encrypted ciphertext token.
    """
    try:
        f = Fernet(get_encryption_key())
        json_data = json.dumps(data).encode("utf-8")
        return f.encrypt(json_data).decode("utf-8")
    except Exception as e:
        logger.error(f"Payload encryption error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to encrypt payload.",
        )


def decrypt_payload(encrypted_str: str) -> dict:
    """
    Decrypt an encrypted ciphertext token back into a dictionary.
    """
    try:
        f = Fernet(get_encryption_key())
        decrypted_bytes = f.decrypt(encrypted_str.encode("utf-8"))
        return json.loads(decrypted_bytes.decode("utf-8"))
    except Exception as e:
        logger.error(f"Payload decryption error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted encrypted payload.",
        )
