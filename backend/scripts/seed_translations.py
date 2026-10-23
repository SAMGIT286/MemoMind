"""
MemoMind Translation Seeding Script
Populates the database / cache with all registered static UI strings for Hindi and Marathi.
Uses existing pre-defined translations or calls Gemma for missing strings.
"""

import asyncio
import logging
import os
import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

from database.mongodb import get_database, collection, memory_store, utc_now
from models.translation import normalize_language_code, TranslationItem
from services.gemma_translator import gemma_translator, generate_content_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_translations")


def parse_translations_js():
    """Extract translation dictionary from frontend/src/utils/translations.js."""
    js_path = BASE_DIR.parent / "frontend" / "src" / "utils" / "translations.js"
    if not js_path.is_file():
        logger.warning(f"Could not find translations.js at {js_path}")
        return {}

    content = js_path.read_text(encoding="utf-8")
    result = {"English": {}, "Hindi": {}, "Marathi": {}}
    current_lang = None

    for line in content.splitlines():
        line_clean = line.strip()
        if line_clean.startswith("English: {"):
            current_lang = "English"
            continue
        elif line_clean.startswith("Hindi: {"):
            current_lang = "Hindi"
            continue
        elif line_clean.startswith("Marathi: {"):
            current_lang = "Marathi"
            continue
        elif line_clean.startswith("},"):
            if current_lang:
                pass

        if current_lang:
            m = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*["\'](.*)["\'],?\s*$', line_clean)
            if m:
                k, v = m.group(1), m.group(2)
                v = v.replace(r'\"', '"').replace(r"\'", "'")
                result[current_lang][k] = v

    return result


async def seed_translations():
    logger.info("Starting MemoMind translation seeding...")
    raw_data = parse_translations_js()
    english_strings = raw_data.get("English", {})
    hindi_strings = raw_data.get("Hindi", {})
    marathi_strings = raw_data.get("Marathi", {})

    logger.info(f"Loaded {len(english_strings)} English strings, {len(hindi_strings)} Hindi strings, {len(marathi_strings)} Marathi strings.")

    languages_to_seed = [
        ("hi", "Hindi", hindi_strings),
        ("mr", "Marathi", marathi_strings),
    ]

    total_seeded = 0
    total_gemma_calls = 0

    for target_code, target_name, pre_translations in languages_to_seed:
        logger.info(f"Processing language: {target_name} ({target_code})...")
        missing_items = []

        for key, en_text in english_strings.items():
            if not en_text or not isinstance(en_text, str):
                continue

            content_hash = generate_content_hash(en_text, "en", target_code, "ui")
            existing_db = gemma_translator.find_in_db(content_hash, key=key, target_lang=target_code)

            if existing_db and existing_db.get("translated_text"):
                continue

            pre_translated = pre_translations.get(key)
            if pre_translated and isinstance(pre_translated, str) and pre_translated.strip():
                record = {
                    "translation_key": key,
                    "original_text": en_text,
                    "source_language": "en",
                    "target_language": target_code,
                    "translated_text": pre_translated.strip(),
                    "context": "ui",
                    "content_hash": content_hash,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                }
                gemma_translator.save_to_db(record)
                total_seeded += 1
            else:
                missing_items.append(TranslationItem(key=key, text=en_text, context="ui"))

        if missing_items:
            logger.info(f"Translating {len(missing_items)} missing strings for {target_name} using Gemma...")
            translated_results = await gemma_translator.translate_batch(
                missing_items,
                source_lang="en",
                target_lang=target_code,
            )
            total_gemma_calls += len(translated_results)
            total_seeded += len(translated_results)
            logger.info(f"Successfully processed {len(translated_results)} strings for {target_name}.")

    logger.info(f"Translation seeding complete! Total strings seeded: {total_seeded}.")


if __name__ == "__main__":
    asyncio.run(seed_translations())
