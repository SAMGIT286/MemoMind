import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# pyrefly: ignore [missing-import]
import httpx
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

from database.mongodb import collection, memory_store, utc_now
from models.translation import (
    TranslationItem,
    get_language_display_name,
    normalize_language_code,
)

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)

logger = logging.getLogger("gemma_translator")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Marathi-specific lexicon and grammar particles
MARATHI_INDICATORS = re.compile(
    r"(?:(?<=\s)|^)(आहे|नाही|आहेत|नाहीत|झाले|झाला|झाली|घ्या|द्या|करा|करावे|बघ|पहा|उद्या|"
    r"सकाळी|दुपारी|संध्याकाळी|रात्री|औषध|माझे|माझी|माझा|तुमचे|तुमची|तुमचा|"
    r"च्या|साठी|मध्ये|वरून|कडून|पुढील|मागील|नका|बघा|कसे|आहोत|होते|होती)(?=(?:\s|[.,!?।]|$))|ळ"
)

# Hindi-specific lexicon and grammar particles
HINDI_INDICATORS = re.compile(
    r"(?:(?<=\s)|^)(है|हैं|नहीं|हुआ|हुई|हुए|लो|दो|कीजिए|करना|देख|कल|सुबह|दोपहर|शाम|रात|"
    r"दवा|दवाइयाँ|दवाएं|मुलाकात|मेरा|मेरी|मेरे|आपका|आपकी|आपके|के|की|का|लिए|"
    r"में|से|पर|को|था|थी|थे|हूँ|हो|नमस्ते|शुभ|होगी|होगा|होंगे)(?=(?:\s|[.,!?।]|$))"
)



def generate_content_hash(text: str, source_lang: str, target_lang: str, context: str = "ui") -> str:
    """Generate deterministic SHA-256 hash based on content, source lang, target lang, and context."""
    normalized_source = normalize_language_code(source_lang)
    normalized_target = normalize_language_code(target_lang)
    normalized_context = (context or "ui").strip().lower()
    raw_key = f"{(text or '').strip()}||{normalized_source}||{normalized_target}||{normalized_context}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


STATIC_NAME_TRANSLITERATIONS: dict[str, dict[str, str]] = {
    "siddhi khade": {"mr": "सिद्धी खाडे", "hi": "सिद्धि खाडे", "en": "Siddhi Khade"},
    "samruddhi khade": {"mr": "समृद्धी खाडे", "hi": "समृद्धि खाडे", "en": "Samruddhi Khade"},
    "siddhi": {"mr": "सिद्धी", "hi": "सिद्धि", "en": "Siddhi"},
    "samruddhi": {"mr": "समृद्धी", "hi": "समृद्धि", "en": "Samruddhi"},
    "khade": {"mr": "खाडे", "hi": "खाडे", "en": "Khade"},
    "rajesh sharma": {"mr": "राजेश शर्मा", "hi": "राजेश शर्मा", "en": "Rajesh Sharma"},
    "dr. rajesh sharma": {"mr": "डॉ. राजेश शर्मा", "hi": "डॉ. राजेश शर्मा", "en": "Dr. Rajesh Sharma"},
    "dr. sharma": {"mr": "डॉ. शर्मा", "hi": "डॉ. शर्मा", "en": "Dr. Sharma"},
    "rajesh": {"mr": "राजेश", "hi": "राजेश", "en": "Rajesh"},
    "sharma": {"mr": "शर्मा", "hi": "शर्मा", "en": "Sharma"},
    "aarav": {"mr": "आरव", "hi": "आरव", "en": "Aarav"},
    "priya": {"mr": "प्रिया", "hi": "प्रिया", "en": "Priya"},
    "rahul": {"mr": "राहुल", "hi": "राहुल", "en": "Rahul"},
    "anjali": {"mr": "अंजली", "hi": "अंजलि", "en": "Anjali"},
    "amit": {"mr": "अमित", "hi": "अमित", "en": "Amit"},
    "kavita": {"mr": "कविता", "hi": "कविता", "en": "Kavita"},
    "pooja": {"mr": "पूजा", "hi": "पूजा", "en": "Pooja"},
    "vikram": {"mr": "विक्रम", "hi": "विक्रम", "en": "Vikram"},
    "rohan": {"mr": "रोहन", "hi": "रोहन", "en": "Rohan"},
    "neha": {"mr": "नेहा", "hi": "नेहा", "en": "Neha"},
    "suresh": {"mr": "सुरेश", "hi": "सुरेश", "en": "Suresh"},
    "sunita": {"mr": "सुनीता", "hi": "सुनीता", "en": "Sunita"},
    "ramesh": {"mr": "रमेश", "hi": "रमेश", "en": "Ramesh"},
    "dr. anand patil": {"mr": "डॉ. आनंद पाटील", "hi": "डॉ. आनंद पाटिल", "en": "Dr. Anand Patil"},
    "anand patil": {"mr": "आनंद पाटील", "hi": "आनंद पाटिल", "en": "Anand Patil"},
    "patil": {"mr": "पाटील", "hi": "पाटिल", "en": "Patil"},
    "anand": {"mr": "आनंद", "hi": "आनंद", "en": "Anand"},
}


class GemmaTranslator:
    def __init__(self):
        self.api_key = os.getenv("GEMMA_API_KEY") or os.getenv("OPENROUTER_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = os.getenv("GEMMA_MODEL") or os.getenv("OPENROUTER_MODEL") or "google/gemma-3-27b-it"
        self._static_loaded = False
        self._load_static_dictionary()

    def _load_static_dictionary(self):
        """Pre-populate translation memory store from frontend translations dictionary."""
        if self._static_loaded:
            return
        self._static_loaded = True
        js_path = BASE_DIR.parent / "frontend" / "src" / "utils" / "translations.js"
        if not js_path.is_file():
            return

        try:
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
                    pass

                if current_lang:
                    m = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*["\'](.*)["\'],?\s*$', line_clean)
                    if m:
                        k, v = m.group(1), m.group(2)
                        v = v.replace(r'\"', '"').replace(r"\'", "'")
                        result[current_lang][k] = v

            store = memory_store("translations")
            existing_hashes = {item.get("content_hash") for item in store}

            english_dict = result.get("English", {})
            for target_code, lang_name in [("hi", "Hindi"), ("mr", "Marathi")]:
                target_dict = result.get(lang_name, {})
                for key, en_text in english_dict.items():
                    if key in target_dict and isinstance(target_dict[key], str):
                        h = generate_content_hash(en_text, "en", target_code, "ui")
                        if h not in existing_hashes:
                            existing_hashes.add(h)
                            store.append({
                                "translation_key": key,
                                "content_type": "ui",
                                "original_text": en_text,
                                "source_language": "en",
                                "target_language": target_code,
                                "translated_text": target_dict[key],
                                "context": "ui",
                                "content_hash": h,
                                "created_at": utc_now(),
                                "updated_at": utc_now(),
                            })
        except Exception as e:
            logger.warning(f"Could not load static translations into memory: {e}")

    def _get_collection(self):
        try:
            return collection("translations")
        except Exception:
            return None

    def detect_language(self, text: str, fallback_lang: str = "en") -> str:
        """
        Detect source language ('en', 'hi', 'mr') of text.
        Uses fast script & morphology inspection, falling back to default/fallback.
        """
        if not text or not isinstance(text, str) or not text.strip():
            return normalize_language_code(fallback_lang)

        clean = text.strip()

        # Check for Devanagari Unicode range (0900-097F)
        has_devanagari = bool(re.search(r"[\u0900-\u097F]", clean))
        has_latin = bool(re.search(r"[a-zA-Z]", clean))

        if not has_devanagari and has_latin:
            return "en"

        if has_devanagari:
            mr_matches = len(MARATHI_INDICATORS.findall(clean))
            hi_matches = len(HINDI_INDICATORS.findall(clean))

            if mr_matches > hi_matches:
                return "mr"
            elif hi_matches > mr_matches:
                return "hi"
            elif mr_matches > 0:
                return "mr"

            norm_fallback = normalize_language_code(fallback_lang)
            if norm_fallback in ("mr", "hi"):
                return norm_fallback
            return "hi"

        return normalize_language_code(fallback_lang)

    def find_in_db(
        self,
        content_hash: str,
        text: Optional[str] = None,
        key: Optional[str] = None,
        target_lang: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """Search MongoDB and memory store for cached translation."""
        translations_col = self._get_collection()
        target_code = normalize_language_code(target_lang) if target_lang else None

        if translations_col is not None:
            try:
                # Query by content hash
                if content_hash:
                    record = translations_col.find_one({"content_hash": content_hash})
                    if record:
                        return record
                # Query by key + target_language
                if key and target_code:
                    record = translations_col.find_one({"translation_key": key, "target_language": target_code})
                    if record:
                        return record
                # Query by original_text + target_language
                if text and target_code:
                    record = translations_col.find_one({"original_text": text.strip(), "target_language": target_code})
                    if record:
                        return record
            except Exception:
                pass

        # Fallback to in-memory store
        store = memory_store("translations")
        for item in store:
            if content_hash and item.get("content_hash") == content_hash:
                return item
            if key and target_code and item.get("translation_key") == key and item.get("target_language") == target_code:
                return item
            if text and target_code and (item.get("original_text") or "").strip() == text.strip() and item.get("target_language") == target_code:
                return item

        return None

    def save_to_db(self, record: dict[str, Any]) -> None:
        """Persist translation record to MongoDB and memory store."""
        translations_col = self._get_collection()
        record_to_save = {
            **record,
            "updated_at": utc_now(),
        }
        if "created_at" not in record_to_save:
            record_to_save["created_at"] = utc_now()

        if translations_col is not None:
            try:
                translations_col.update_one(
                    {"content_hash": record["content_hash"]},
                    {"$set": record_to_save},
                    upsert=True,
                )
            except Exception as e:
                logger.error(f"Error saving translation to MongoDB: {e}")

        # Synchronize memory store
        store = memory_store("translations")
        existing_idx = next(
            (i for i, item in enumerate(store) if item.get("content_hash") == record["content_hash"]),
            -1,
        )
        if existing_idx >= 0:
            store[existing_idx] = record_to_save
        else:
            store.append(record_to_save)

    async def _call_gemma_api(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Call Gemma translation model via secure backend endpoint."""
        api_key = os.getenv("GEMMA_API_KEY") or os.getenv("OPENROUTER_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("No API key configured for Gemma translation.")

        default_sys = (
            "You are an expert multilingual translator and transliterator for MemoMind healthcare and memory assistant. "
            "Translate accurately, naturally, and respectfully between English, Hindi, and Marathi. "
            "CRITICAL RULES:\n"
            "1. ALWAYS preserve placeholders like {{name}}, {{date}}, {variable}, URLs, HTML tags, numbers, time, dosages, and punctuation.\n"
            "2. When transliterating names, convert phonetically into natural Devanagari script for Hindi/Marathi without changing pronunciation.\n"
            "3. Return ONLY the requested JSON array format. Do NOT add conversational prose, explanations, or markdown code blocks."
        )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://memomind.app",
            "X-Title": "MemoMind Translation Service",
        }

        # Try configured models
        models_to_try = [
            self.model,
            "google/gemma-3-27b-it",
            "google/gemma-2-9b-it",
        ]
        # Deduplicate while preserving order
        unique_models = []
        for m in models_to_try:
            if m and m not in unique_models:
                unique_models.append(m)

        last_err = None
        for candidate_model in unique_models:
            payload = {
                "model": candidate_model,
                "messages": [
                    {
                        "role": "system",
                        "content": system_instruction or default_sys,
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                "temperature": 0.05,
                "max_tokens": 4000,
            }

            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        content = data["choices"][0]["message"]["content"]
                        return content.strip()
                    else:
                        logger.warning(f"Model {candidate_model} returned {response.status_code}: {response.text}")
                        last_err = RuntimeError(f"HTTP {response.status_code}")
            except Exception as e:
                logger.warning(f"Model {candidate_model} request error: {e}")
                last_err = e

        raise last_err or RuntimeError("All AI translation models failed.")

    async def transliterate_name(
        self,
        name: str,
        target_lang: str = "mr",
        source_lang: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Transliterate/translate user's name phonetically.
        E.g. 'Siddhi Khade' -> mr: 'सिद्धी खाडे', hi: 'सिद्धि खाडे'.
        Preserves original name as source of truth.
        """
        if not name or not isinstance(name, str) or not name.strip():
            return name

        clean_name = name.strip()
        src_code = normalize_language_code(source_lang or self.detect_language(clean_name))
        tgt_code = normalize_language_code(target_lang)

        if src_code == tgt_code:
            return clean_name

        # Check static transliteration map
        name_lower = clean_name.lower()
        if name_lower in STATIC_NAME_TRANSLITERATIONS:
            mapped = STATIC_NAME_TRANSLITERATIONS[name_lower].get(tgt_code)
            if mapped:
                return mapped

        # Check word-by-word transliteration
        words = clean_name.split()
        if len(words) > 1:
            transliterated_words = []
            all_found = True
            for w in words:
                wl = w.lower()
                if wl in STATIC_NAME_TRANSLITERATIONS and tgt_code in STATIC_NAME_TRANSLITERATIONS[wl]:
                    transliterated_words.append(STATIC_NAME_TRANSLITERATIONS[wl][tgt_code])
                else:
                    all_found = False
                    break
            if all_found:
                return " ".join(transliterated_words)

        content_hash = generate_content_hash(clean_name, src_code, tgt_code, context="user_name")
        cached = self.find_in_db(content_hash, target_lang=tgt_code, user_id=user_id)
        if cached and cached.get("translated_text"):
            return cached["translated_text"]

        src_name = get_language_display_name(src_code)
        tgt_name = get_language_display_name(tgt_code)

        prompt = (
            f"Transliterate the person's name '{clean_name}' from {src_name} to {tgt_name}.\n"
            f"Requirements:\n"
            f"- For Marathi and Hindi, provide natural phonetic Devanagari spelling (e.g. 'Siddhi Khade' -> 'सिद्धी खाडे' in Marathi).\n"
            f"- For English, provide standard Romanized name spelling.\n"
            f"- Output ONLY a JSON object: {{\"translated_name\": \"...\"}}"
        )

        try:
            raw = await self._call_gemma_api(prompt)
            match = re.search(r"\{.*\"translated_name\"\s*:\s*\"([^\"]+)\".*\}", raw, re.DOTALL)
            if match:
                translated_name = match.group(1).strip()
            else:
                clean_json = re.sub(r"^```json\s*", "", raw)
                clean_json = re.sub(r"```$", "", clean_json).strip()
                parsed = json.loads(clean_json)
                translated_name = parsed.get("translated_name", clean_name).strip()

            if translated_name:
                record = {
                    "content_type": "user_name",
                    "original_text": clean_name,
                    "source_language": src_code,
                    "target_language": tgt_code,
                    "translated_text": translated_name,
                    "context": "user_name",
                    "content_hash": content_hash,
                    "user_id": user_id,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                }
                self.save_to_db(record)
                return translated_name
        except Exception as e:
            logger.error(f"Transliterate name failed for '{clean_name}': {e}")

        return clean_name

    async def translate_batch(
        self,
        items: list[TranslationItem],
        source_lang: str = "en",
        target_lang: str = "hi",
        user_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Translate a batch of items using DB cache first; calls Gemma ONLY for missing items."""
        if not items:
            return []

        tgt_code = normalize_language_code(target_lang)
        results: list[Optional[dict[str, Any]]] = [None] * len(items)
        missing_indices: list[int] = []

        # 1. Check cache first
        for idx, item in enumerate(items):
            item_text = (item.text or "").strip()
            if not item_text:
                results[idx] = {
                    "key": item.key,
                    "original_text": item.text,
                    "translated_text": item.text,
                    "source_language": "en",
                    "target_language": tgt_code,
                    "context": item.context or "ui",
                    "content_hash": "",
                    "cached": True,
                }
                continue

            item_src = normalize_language_code(item.source_language or source_lang or self.detect_language(item_text))

            # Same source and target: return immediately
            if item_src == tgt_code:
                results[idx] = {
                    "key": item.key,
                    "original_text": item.text,
                    "translated_text": item.text,
                    "source_language": item_src,
                    "target_language": tgt_code,
                    "context": item.context or "ui",
                    "content_hash": generate_content_hash(item_text, item_src, tgt_code, item.context or "ui"),
                    "cached": True,
                }
                continue

            content_hash = generate_content_hash(item_text, item_src, tgt_code, item.context or "ui")
            cached_record = self.find_in_db(content_hash, text=item_text, key=item.key, target_lang=tgt_code, user_id=user_id or item.user_id)
            if cached_record and cached_record.get("translated_text"):
                results[idx] = {
                    "key": item.key or cached_record.get("translation_key"),
                    "original_text": item.text,
                    "translated_text": cached_record["translated_text"],
                    "source_language": item_src,
                    "target_language": tgt_code,
                    "context": item.context or cached_record.get("context", "ui"),
                    "content_hash": content_hash,
                    "cached": True,
                }
            else:
                missing_indices.append(idx)

        # All items found in cache
        if not missing_indices:
            return [r for r in results if r is not None]

        # 2. Batch missing items and call Gemma in chunks
        CHUNK_SIZE = 20
        for i in range(0, len(missing_indices), CHUNK_SIZE):
            chunk_indices = missing_indices[i : i + CHUNK_SIZE]
            chunk_items = []
            for idx in chunk_indices:
                orig_item = items[idx]
                chunk_src = normalize_language_code(orig_item.source_language or source_lang or self.detect_language(orig_item.text))
                chunk_items.append({
                    "id": idx,
                    "text": orig_item.text,
                    "context": orig_item.context or "ui",
                    "source_lang": chunk_src,
                })

            tgt_name = get_language_display_name(tgt_code)

            prompt = (
                f"Translate each text item in the following JSON array to {tgt_name}.\n"
                f"Respect the provided context for each item (e.g. 'user_name' should be transliterated phonetically, 'medical reminder' or 'medicine' translated clearly).\n"
                f"Preserve all variables like {{name}}, {{date}}, {{0}}, numbers, dosages, URLs, line breaks, and punctuation intact.\n"
                f"Return a strict JSON array of objects with keys 'id' (integer matching input) and 'translated_text' (string).\n\n"
                f"{json.dumps(chunk_items, ensure_ascii=False)}"
            )

            try:
                raw_response = await self._call_gemma_api(prompt)
                json_match = re.search(r"\[\s*\{.*\}\s*\]", raw_response, re.DOTALL)
                if json_match:
                    parsed_translations = json.loads(json_match.group(0))
                else:
                    clean_str = re.sub(r"^```json\s*", "", raw_response)
                    clean_str = re.sub(r"```$", "", clean_str).strip()
                    parsed_translations = json.loads(clean_str)

                translation_map = {
                    entry["id"]: entry["translated_text"]
                    for entry in parsed_translations
                    if isinstance(entry, dict) and "id" in entry and "translated_text" in entry
                }

                for idx in chunk_indices:
                    orig_item = items[idx]
                    translated = translation_map.get(idx, orig_item.text)
                    item_src = normalize_language_code(orig_item.source_language or source_lang or self.detect_language(orig_item.text))
                    content_hash = generate_content_hash(orig_item.text, item_src, tgt_code, orig_item.context or "ui")

                    record = {
                        "translation_key": orig_item.key,
                        "content_type": orig_item.content_type or "ui",
                        "content_id": orig_item.content_id,
                        "original_text": orig_item.text,
                        "source_language": item_src,
                        "target_language": tgt_code,
                        "translated_text": translated,
                        "context": orig_item.context or "ui",
                        "content_hash": content_hash,
                        "user_id": user_id or orig_item.user_id,
                        "created_at": utc_now(),
                        "updated_at": utc_now(),
                    }

                    self.save_to_db(record)

                    results[idx] = {
                        "key": orig_item.key,
                        "original_text": orig_item.text,
                        "translated_text": translated,
                        "source_language": item_src,
                        "target_language": tgt_code,
                        "context": orig_item.context or "ui",
                        "content_hash": content_hash,
                        "cached": False,
                    }

            except Exception as err:
                logger.error(f"Gemma translation chunk failed: {err}")
                for idx in chunk_indices:
                    orig_item = items[idx]
                    item_src = normalize_language_code(orig_item.source_language or source_lang or self.detect_language(orig_item.text))
                    content_hash = generate_content_hash(orig_item.text, item_src, tgt_code, orig_item.context or "ui")
                    results[idx] = {
                        "key": orig_item.key,
                        "original_text": orig_item.text,
                        "translated_text": orig_item.text,
                        "source_language": item_src,
                        "target_language": tgt_code,
                        "context": orig_item.context or "ui",
                        "content_hash": content_hash,
                        "cached": False,
                        "error": str(err),
                    }

        return [r for r in results if r is not None]

    async def translate_single(
        self,
        text: str,
        source_lang: str = "en",
        target_lang: str = "hi",
        context: str = "general",
        key: Optional[str] = None,
        content_id: Optional[str] = None,
        content_type: Optional[str] = "general",
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """Translate a single text string."""
        item = TranslationItem(
            key=key,
            text=text,
            context=context,
            source_language=source_lang,
            content_id=content_id,
            content_type=content_type,
            user_id=user_id,
        )
        batch_results = await self.translate_batch(
            [item],
            source_lang=source_lang,
            target_lang=target_lang,
            user_id=user_id,
        )
        return batch_results[0]

    def get_all_translations_for_language(self, target_lang: str) -> dict[str, str]:
        """Fetch all stored key-value translations for a given language to hydrate frontend cache."""
        target_code = normalize_language_code(target_lang)
        translations_col = self._get_collection()
        dictionary: dict[str, str] = {}

        if translations_col is not None:
            try:
                cursor = translations_col.find({"target_language": target_code})
                for doc in cursor:
                    if doc.get("translation_key"):
                        dictionary[doc["translation_key"]] = doc.get("translated_text", "")
                    if doc.get("content_hash"):
                        dictionary[f"hash:{doc['content_hash']}"] = doc.get("translated_text", "")
            except Exception:
                pass

        # Also merge from in-memory store
        store = memory_store("translations")
        for doc in store:
            if doc.get("target_language") == target_code:
                if doc.get("translation_key"):
                    dictionary[doc["translation_key"]] = doc.get("translated_text", "")
                if doc.get("content_hash"):
                    dictionary[f"hash:{doc['content_hash']}"] = doc.get("translated_text", "")

        return dictionary


gemma_translator = GemmaTranslator()


def detect_source_language(text: str, fallback_lang: str = "en") -> str:
    """Helper function to detect source language of text."""
    return gemma_translator.detect_language(text, fallback_lang=fallback_lang)


def transliterate_name(name: str, target_lang: str) -> str:
    """Helper function to transliterate names phonetically."""
    return gemma_translator.transliterate_name(name, target_lang=target_lang)

