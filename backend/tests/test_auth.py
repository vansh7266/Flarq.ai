from app.core.security import hash_password, verify_password


def test_password_hash_roundtrip() -> None:
    password = "correct horse battery staple"
    hashed = hash_password(password)
    assert verify_password(password, hashed)


def test_password_hash_rejects_invalid() -> None:
    hashed = hash_password("secret-value")
    assert not verify_password("wrong", hashed)
