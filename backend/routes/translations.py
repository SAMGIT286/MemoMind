import logging
from typing import Any
# pyrefly: ignore [missing-import]
from fastapi import APIRouter

from models.translation import (
    BatchTranslationRequest,
    DetectLanguageRequest,
    SingleTranslationRequest,
    TransliterateNameRequest,
    normalize_language_code,
)
from services.gemma_translator import gemma_translator

logger = logging.getLogger("translations_route")

router = APIRouter(prefix="/api/translations", tags=["translations"])


@router.get("/{language}")
def get_all_translations(language: str):
    """Fetch all pre-translated UI strings and cached content for a target language."""
    target_code = normalize_language_code(language)
    try:
        data = gemma_translator.get_all_translations_for_language(target_code)
        return {"language": target_code, "translations": data}
    except Exception as exc:
        logger.error(f"Error fetching translations for {language}: {exc}")
        return {"language": target_code, "translations": {}}


@router.post("/batch")
async def translate_batch(request: BatchTranslationRequest):
    """Batch translation endpoint. Checks database first; calls Gemma only for missing strings."""
    if not request.items:
        return {"translations": [], "target_language": normalize_language_code(request.target_language)}

    try:
        results = await gemma_translator.translate_batch(
            items=request.items,
            source_lang=request.source_language,
            target_lang=request.target_language,
            user_id=request.user_id,
        )
        return {
            "translations": results,
            "target_language": normalize_language_code(request.target_language),
        }
    except Exception as exc:
        logger.error(f"Batch translation failed: {exc}")
        src_code = normalize_language_code(request.source_language)
        tgt_code = normalize_language_code(request.target_language)
        fallback_results = [
            {
                "key": item.key,
                "original_text": item.text,
                "translated_text": item.text,
                "source_language": src_code,
                "target_language": tgt_code,
                "context": item.context or "ui",
                "cached": False,
                "error": str(exc),
            }
            for item in request.items
        ]
        return {"translations": fallback_results, "target_language": tgt_code}


@router.post("/translate")
async def translate_single(request: SingleTranslationRequest):
    """Translate single dynamic content string."""
    try:
        result = await gemma_translator.translate_single(
            text=request.text,
            source_lang=request.source_language,
            target_lang=request.target_language,
            context=request.context or "general",
            key=request.key,
            content_id=request.content_id,
            content_type=request.content_type,
            user_id=request.user_id,
        )
        return result
    except Exception as exc:
        logger.error(f"Single translation failed: {exc}")
        return {
            "key": request.key,
            "original_text": request.text,
            "translated_text": request.text,
            "source_language": normalize_language_code(request.source_language),
            "target_language": normalize_language_code(request.target_language),
            "context": request.context,
            "cached": False,
            "error": str(exc),
        }


@router.post("/detect")
def detect_language(request: DetectLanguageRequest):
    """Detect language of given text string ('en', 'hi', 'mr')."""
    lang = gemma_translator.detect_language(request.text)
    return {"language": lang, "detected": True}


@router.post("/name")
async def transliterate_name(request: TransliterateNameRequest):
    """Transliterate person's name phonetically for target language."""
    try:
        translated = await gemma_translator.transliterate_name(
            name=request.name,
            target_lang=request.target_language,
            source_lang=request.source_language,
        )
        return {
            "original_name": request.name,
            "target_language": normalize_language_code(request.target_language),
            "translated_name": translated,
        }
    except Exception as exc:
        logger.error(f"Transliterate name endpoint error: {exc}")
        return {
            "original_name": request.name,
            "target_language": normalize_language_code(request.target_language),
            "translated_name": request.name,
            "error": str(exc),
        }
