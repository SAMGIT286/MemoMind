import asyncio
import sys
import os

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.translation import (
    normalize_language_code,
    get_language_display_name,
    BatchTranslationRequest,
    SingleTranslationRequest,
    DetectLanguageRequest,
    TransliterateNameRequest,
    TranslationItem,
)
from services.gemma_translator import (
    gemma_translator,
    generate_content_hash,
    detect_source_language,
    transliterate_name,
)

async def test_suite():
    print("==================================================")
    print("STARTING MULTILINGUAL VERIFICATION TEST SUITE")
    print("==================================================")

    # 1. Test Language Code Normalization
    assert normalize_language_code("mr") == "mr"
    assert normalize_language_code("Marathi") == "mr"
    assert normalize_language_code("hi") == "hi"
    assert normalize_language_code("Hindi") == "hi"
    assert normalize_language_code("en") == "en"
    assert normalize_language_code("English") == "en"
    print("[PASS] Test 1: Language code normalization (en, hi, mr)")

    # 2. Test Transliteration of Names
    # Requirement: "Siddhi Khade" in Marathi -> "सिद्धी खाडे", in Hindi -> "सिद्धि खाडे"
    # pyrefly: ignore [not-async]
    siddhi_mr = await transliterate_name("Siddhi Khade", "mr")
    print(f"Transliterated 'Siddhi Khade' to Marathi: {siddhi_mr}")
    assert "सिद्धी खाडे" in siddhi_mr or "सिद्धी" in siddhi_mr

    # pyrefly: ignore [not-async]
    siddhi_hi = await transliterate_name("Siddhi Khade", "hi")
    print(f"Transliterated 'Siddhi Khade' to Hindi: {siddhi_hi}")
    assert "सिद्धि खाडे" in siddhi_hi or "सिद्धी खाडे" in siddhi_hi or "सिद्धि" in siddhi_hi

    # pyrefly: ignore [not-async]
    samruddhi_mr = await transliterate_name("Samruddhi Khade", "mr")
    print(f"Transliterated 'Samruddhi Khade' to Marathi: {samruddhi_mr}")
    assert "समृद्धी खाडे" in samruddhi_mr

    # pyrefly: ignore [not-async]
    dr_mr = await transliterate_name("Dr. Rajesh Sharma", "mr")
    print(f"Transliterated 'Dr. Rajesh Sharma' to Marathi: {dr_mr}")
    assert "राजेश शर्मा" in dr_mr
    print("[PASS] Test 2: User name and doctor name phonetic transliteration")

    # 3. Test Static UI Translations from pre-populated dictionary
    ui_mr = gemma_translator.get_all_translations_for_language("mr")
    assert len(ui_mr) > 50, f"Expected > 50 translations, got {len(ui_mr)}"
    assert ui_mr.get("dashboard.title") == "डॅशबोर्ड" or ui_mr.get("navDashboard") == "डॅशबोर्ड"
    assert "औषधे" in str(ui_mr.values())
    print(f"[PASS] Test 3: Loaded {len(ui_mr)} Marathi static UI keys")

    ui_hi = gemma_translator.get_all_translations_for_language("hi")
    assert len(ui_hi) > 50
    assert "दवाइयां" in str(ui_hi.values()) or "डैशबोर्ड" in str(ui_hi.values())
    print(f"[PASS] Test 3b: Loaded {len(ui_hi)} Hindi static UI keys")

    # 4. Test Language Detection for User-Added Content
    # Marathi text
    text_mr = "रात्री ८ वाजता औषध घ्या."
    detected_mr = detect_source_language(text_mr)
    print(f"Detected language for '{text_mr}': {detected_mr}")
    assert detected_mr == "mr"

    # Hindi text
    text_hi = "कल मेरी डॉक्टर से मुलाकात है।"
    detected_hi = detect_source_language(text_hi)
    print(f"Detected language for '{text_hi}': {detected_hi}")
    assert detected_hi == "hi"

    # English text
    text_en = "Take medicine after dinner."
    detected_en = detect_source_language(text_en)
    print(f"Detected language for '{text_en}': {detected_en}")
    assert detected_en == "en"
    print("[PASS] Test 4: Automatic source language detection")

    # 5. Test Batch Translation & Cache Hits
    # Single Translation
    res_mr = await gemma_translator.translate_single(
        text="Take medicine after dinner.",
        target_lang="mr",
        source_lang="en",
        context="medical reminder"
    )
    print(f"Translated to mr: '{res_mr['translated_text']}'")
    assert "जेवण" in res_mr['translated_text'] or "औषध" in res_mr['translated_text']

    # Translate from Original to Hindi (Never translate from translation!)
    res_hi = await gemma_translator.translate_single(
        text="Take medicine after dinner.",
        target_lang="hi",
        source_lang="en",
        context="medical reminder"
    )
    print(f"Translated to hi: '{res_hi['translated_text']}'")
    assert "दवा" in res_hi['translated_text'] or "खाना" in res_hi['translated_text']

    # Verify that requesting the same translation hits the cache (0 API latency)
    hash_mr = generate_content_hash("Take medicine after dinner.", "en", "mr", "medical reminder")
    cached_doc = gemma_translator.find_in_db(hash_mr, text="Take medicine after dinner.", target_lang="mr")
    print(f"Cache lookup for 'Take medicine after dinner.': {cached_doc}")
    assert cached_doc is not None
    assert cached_doc.get("translated_text") == res_mr['translated_text']
    print("[PASS] Test 5: Cache hit & translation from original source")

    # 6. Test Batch Request
    batch_req = [
        TranslationItem(text="Take medicine at 8 PM.", source_language="en", context="medicine", content_id="med_1"),
        TranslationItem(text="Doctor appointment tomorrow at 5 PM.", source_language="en", context="appointment", content_id="appt_1"),
        TranslationItem(text="Morning Walk", source_language="en", context="reminder", content_id="notif_1"),
    ]
    batch_results = await gemma_translator.translate_batch(batch_req, target_lang="mr")
    print(f"Batch results ({len(batch_results)} items):")
    for r in batch_results:
        print(f"  [{r.get('content_id') or r.get('key')}] {r['original_text']} -> {r['translated_text']}")
        assert len(r['translated_text']) > 0
    print("[PASS] Test 6: Batch translation with context preservation")

    # 7. Test Variable and Placeholder Preservation
    var_text = "Hello {{name}}, your appointment is on {{date}} at 10:00 AM."
    var_translated = await gemma_translator.translate_single(
        text=var_text,
        target_lang="mr",
        source_lang="en",
        context="notification"
    )
    print(f"Variable preservation test: '{var_text}' -> '{var_translated['translated_text']}'")
    assert "{{name}}" in var_translated['translated_text']
    assert "{{date}}" in var_translated['translated_text']
    print("[PASS] Test 7: Variable and placeholder preservation ({{name}}, {{date}})")

    print("==================================================")
    print("ALL 7 CORE BACKEND TEST SCENARIOS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_suite())
