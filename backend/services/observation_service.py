import re
from typing import Any
from uuid import uuid4
from bson import ObjectId

from database.mongodb import collection, memory_store, serialize

OBJECT_SYNONYMS: dict[str, list[str]] = {
    "phone": ["phone", "cell phone", "cellphone", "mobile", "smartphone", "iphone", "android", "telephone", "à¤«à¥‹à¤¨", "à¤®à¥‹à¤¬à¤¾à¤ˆà¤²", "à¤®à¥‹à¤¬à¤¾à¤‡à¤²"],
    "keys": ["keys", "key", "keychain", "car keys", "house keys", "chabi", "chavi", "killi", "à¤šà¤¾à¤¬à¥€", "à¤•à¤¿à¤²à¥à¤²à¥€", "à¤šà¤¾à¤µà¥à¤¯à¤¾", "à¤šà¤¾à¤¬à¥à¤¯à¤¾"],
    "glasses": ["glasses", "spectacles", "specs", "reading glasses", "sunglasses", "goggles", "eyewear", "chashma", "chasma", "chashme", "goggle", "à¤šà¤¶à¥à¤®à¤¾", "à¤šà¤·à¥à¤®à¤¾", "à¤—à¥‰à¤—à¤²à¥à¤¸"],
    "wallet": ["wallet", "purse", "billfold", "money clip", "cardholder", "batwa", "pakit", "à¤¬à¤Ÿà¥à¤†", "à¤ªà¤¾à¤•à¥€à¤Ÿ", "à¤ªà¤°à¥à¤¸"],
    "charger": ["charger", "charging cable", "cable", "power adapter", "wire", "adapter", "charging", "à¤šà¤¾à¤°à¥à¤œà¤¿à¤‚à¤—", "à¤šà¤¾à¤°à¥à¤œà¤°"],
    "earphones": ["earphones", "headphones", "earbuds", "airpods", "headset", "buds", "earphone", "headphone", "à¤ˆà¤¯à¤°à¤«à¥‹à¤¨", "à¤¹à¥‡à¤¡à¤«à¥‹à¤¨", "à¤‡à¤…à¤°à¤«à¥‹à¤¨"],
    "watch": ["watch", "smartwatch", "wrist watch", "wristwatch", "clock", "ghadi", "ghadiyal", "à¤˜à¤¡à¤¼à¥€", "à¤˜à¤¡à¥à¤¯à¤¾à¤³"],
    "card": ["card", "credit card", "debit card", "id card", "identity card", "atm card", "pan card", "aadhaar", "à¤•à¤¾à¤°à¥à¤¡"],
    "pen": ["pen", "pencil", "marker", "ballpoint", "à¤ªà¥‡à¤¨", "à¤ªà¥‡à¤¨à¥à¤¸à¤¿à¤²"],
    "bottle": ["bottle", "water bottle", "flask", "botal", "batli", "à¤¬à¥‹à¤¤à¤²", "à¤¬à¤¾à¤Ÿà¤²à¥€"],
    "cup": ["cup", "mug", "coffee cup", "tea cup", "glass", "à¤—à¥à¤²à¤¾à¤¸", "à¤•à¤ª"],
    "laptop": ["laptop", "computer", "notebook", "pc", "macbook", "à¤²à¥…à¤ªà¤Ÿà¥‰à¤ª", "à¤•à¤®à¥à¤ªà¥à¤¯à¥‚à¤Ÿà¤°"],
    "book": ["book", "notebook", "diary", "journal", "pustak", "kitab", "à¤ªà¥à¤¸à¥à¤¤à¤•", "à¤µà¤¹à¥€", "à¤•à¤¿à¤¤à¤¾à¤¬"],
    "backpack": ["backpack", "bag", "handbag", "purse", "tote", "sack", "pishvi", "theli", "à¤¬à¥ˆà¤—", "à¤ªà¤¿à¤¶à¤µà¥€", "à¤¦à¤«à¥à¤¤à¤°"],
    "remote": ["remote", "tv remote", "controller", "à¤°à¤¿à¤®à¥‹à¤Ÿ"],
    "medicine": ["medicine", "pill", "tablet", "capsule", "syrup", "medication", "dawa", "aushadh", "goli", "golya", "à¤¦à¤µà¤¾", "à¤”à¤·à¤§", "à¤—à¥‹à¤³à¥à¤¯à¤¾"],
    "scissors": ["scissors", "scissor", "kainchi", "katri", "à¤•à¥ˆà¤‚à¤šà¥€", "à¤•à¤¾à¤¤à¥à¤°à¥€"],
    "umbrella": ["umbrella", "chhate", "chhatri", "à¤›à¤¾à¤¤à¤¾", "à¤›à¤¤à¥à¤°à¥€"],
    "sofa": ["sofa", "couch", "à¤¸à¥‹à¤«à¤¾"],
    "chair": ["chair", "kursi", "khurchi", "à¤•à¥à¤°à¥à¤¸à¥€", "à¤–à¥à¤°à¥à¤šà¥€"],
    "table": ["table", "dining table", "desk", "mej", "à¤®à¥‡à¤œ", "à¤Ÿà¥‡à¤¬à¤²"],
}

STOP_WORDS = {
    "where", "is", "my", "the", "are", "find", "me", "locate", "did", "i", "leave", "put", "what", "which",
    "a", "an", "in", "on", "at", "to", "for", "please", "can", "you", "tell", "show", "of", "some", "any",
    "mera", "meri", "mere", "kahan", "hai", "hain", "dhoondo", "majhe", "majha", "majhi", "kuthe", "aahe", "shodha",
    "rakha", "rakhi", "thevla", "thevli"
}


def _get_target_terms(query_str: str) -> list[str]:
    """Extract search terms and synonyms for a natural language or multilingual query."""
    if not query_str:
        return []
    cleaned = re.sub(r"[^\w\s\u0900-\u097F]", " ", query_str.lower())
    tokens = [w for w in cleaned.split() if w and w not in STOP_WORDS]
    if not tokens:
        tokens = [query_str.strip().lower()]

    terms = set(tokens)
    # Check for synonym expansion
    for canonical, syn_list in OBJECT_SYNONYMS.items():
        if any(token in syn_list for token in tokens) or any(s in query_str.lower() for s in syn_list):
            terms.add(canonical)
            terms.update(syn_list)

    return list(terms)


def create_observations(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not items:
        return []
    records = collection("observations")
    if records is not None:
        result = records.insert_many(items)
        return [serialize(records.find_one({"_id": item_id})) for item_id in result.inserted_ids]
    store = memory_store("observations")
    enriched = [{**item, "id": str(uuid4())} for item in items]
    store.extend(enriched)
    return enriched


def list_observations(object_name: str | None = None, person_name: str | None = None, limit: int | None = None) -> list[dict[str, Any]]:
    records = collection("observations")
    terms = _get_target_terms(object_name) if object_name else []

    if records is not None:
        query: dict[str, Any] = {}
        if terms:
            regex_patterns = [re.escape(t) for t in terms]
            query["object"] = {"$regex": "|".join(regex_patterns), "$options": "i"}
        elif object_name and object_name.strip():
            query["object"] = {"$regex": re.escape(object_name.strip()), "$options": "i"}

        if person_name:
            query["person"] = {"$regex": f"^{re.escape(person_name.strip())}$", "$options": "i"}

        cursor = records.find(query).sort("timestamp", -1)
        if limit:
            cursor = cursor.limit(limit)
        return [serialize(item) for item in cursor]

    items = memory_store("observations")

    def _matches_object(stored_obj: str) -> bool:
        if not terms:
            return True
        stored_lower = (stored_obj or "").lower()
        return any(term in stored_lower or stored_lower in term for term in terms)

    results = [
        item for item in items
        if _matches_object(item.get("object", ""))
        and (not person_name or (item.get("person") or "").lower() == person_name.strip().lower())
    ]
    results.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
    if limit:
        results = results[:limit]
    return results


def delete_observation(observation_id: str) -> bool:
    records = collection("observations")
    if records is not None:
        try:
            res = records.delete_one({"_id": ObjectId(observation_id)})
            return res.deleted_count > 0
        except Exception:
            res = records.delete_one({"id": observation_id})
            return res.deleted_count > 0

    items = memory_store("observations")
    initial_len = len(items)
    items[:] = [item for item in items if str(item.get("id")) != observation_id and str(item.get("_id")) != observation_id]
    return len(items) < initial_len


def clear_observations(object_name: str | None = None) -> int:
    records = collection("observations")
    terms = _get_target_terms(object_name) if object_name else []

    if records is not None:
        query: dict[str, Any] = {}
        if terms:
            query["object"] = {"$regex": "|".join(terms), "$options": "i"}
        res = records.delete_many(query)
        return res.deleted_count

    items = memory_store("observations")
    if not terms:
        count = len(items)
        items.clear()
        return count

    initial_len = len(items)
    items[:] = [
        item for item in items
        if not any(t in (item.get("object") or "").lower() for t in terms)
    ]
    return initial_len - len(items)


