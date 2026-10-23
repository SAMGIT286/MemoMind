from typing import Any, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

SUPPORTED_LANGUAGES = {"en", "hi", "mr"}
LANGUAGE_CODE_MAP = {
    "english": "en",
    "en": "en",
    "hindi": "hi",
    "hi": "hi",
    "marathi": "mr",
    "mr": "mr",
}

LANGUAGE_DISPLAY_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
}


def normalize_language_code(lang: Optional[str]) -> str:
    """Normalize language string/code to standard 2-letter code ('en', 'hi', 'mr')."""
    if not lang:
        return "en"
    clean = str(lang).strip().lower()
    return LANGUAGE_CODE_MAP.get(clean, "en" if clean not in SUPPORTED_LANGUAGES else clean)


def get_language_display_name(lang: Optional[str]) -> str:
    """Get full human-readable display name for language."""
    code = normalize_language_code(lang)
    return LANGUAGE_DISPLAY_NAMES.get(code, "English")


class TranslationItem(BaseModel):
    key: Optional[str] = None
    text: str = Field(min_length=1)
    context: Optional[str] = "ui"
    source_language: Optional[str] = None
    content_id: Optional[str] = None
    content_type: Optional[str] = "ui"
    user_id: Optional[str] = None


class SingleTranslationRequest(BaseModel):
    text: str = Field(min_length=1)
    source_language: str = Field(default="en")
    target_language: str = Field(default="hi")
    context: Optional[str] = "general"
    key: Optional[str] = None
    content_id: Optional[str] = None
    content_type: Optional[str] = "general"
    user_id: Optional[str] = None


class BatchTranslationRequest(BaseModel):
    items: list[TranslationItem] = Field(default_factory=list)
    source_language: str = Field(default="en")
    target_language: str = Field(default="hi")
    context: Optional[str] = "ui"
    user_id: Optional[str] = None


class DetectLanguageRequest(BaseModel):
    text: str = Field(min_length=1)


class TransliterateNameRequest(BaseModel):
    name: str = Field(min_length=1)
    target_language: str = Field(default="hi")
    source_language: Optional[str] = None
