# tests/test_auth.py
import pytest
from app.services.auth import generate_api_key

def test_generate_api_key_format():
    raw_key, hashed_key, key_prefix = generate_api_key()
    
    assert raw_key.startswith("glm_")
    assert len(raw_key) > 40
    assert len(hashed_key) == 64  # SHA-256 string length
    assert len(key_prefix) == 12
    assert key_prefix == raw_key[:12]
