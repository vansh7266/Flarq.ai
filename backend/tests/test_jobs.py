from app.utils.text_cleaner import normalize_whitespace


def test_text_cleaner_handles_tabs() -> None:
    assert normalize_whitespace("role\t\trequirements") == "role requirements"
