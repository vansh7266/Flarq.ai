from app.utils.text_cleaner import normalize_whitespace


def test_normalize_whitespace_collapses_spaces() -> None:
    assert normalize_whitespace("  hello   world  ") == "hello world"
