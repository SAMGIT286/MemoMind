import hashlib
import hmac
import secrets
from typing import Any

from database.mongodb import database_configured, get_database, memory_store, serialize, utc_now
from models.translation import normalize_language_code, get_language_display_name


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"{salt.hex()}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 120_000)
        return hmac.compare_digest(expected.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_user(data: dict[str, Any]) -> dict[str, Any] | None:
    database = get_database()
    if database is None and database_configured():
        # If MongoDB is configured but currently offline, use memory store gracefully
        pass
    users = database["users"] if database is not None else None
    credentials = database["credentials"] if database is not None else None
    email = data["email"].lower().strip()
    if users is not None:
        existing_user = users.find_one({"email": email})
    else:
        existing_user = next((item for item in memory_store("users") if item["email"] == email), None)
    if existing_user:
        return None

    raw_lang = data.get("preferred_language") or data.get("language") or "en"
    pref_code = normalize_language_code(raw_lang)
    display_lang = get_language_display_name(pref_code)

    password_hash = _hash_password(data["password"])
    user = {
        "id": secrets.token_hex(12),
        "name": data["name"].strip(),
        "email": email,
        "role": data.get("role", "elderly"),
        "userType": data.get("role", "elderly"),
        "language": display_lang,
        "preferred_language": pref_code,
        "preferences": {
            "language": display_lang,
            "preferred_language": pref_code,
        },
        "setupComplete": False,
        "created_at": utc_now(),
    }
    credential = {
        "user_id": user["id"],
        "email": email,
        "password_hash": password_hash,
        "created_at": user["created_at"],
    }

    if users is not None and credentials is not None:
        users.insert_one(user)
        credentials.insert_one(credential)
    else:
        memory_store("users").append(user)
        memory_store("credentials").append(credential)
    return public_user(user)


def authenticate_user(email: str, password: str, role: str | None = None) -> dict[str, Any] | None:
    database = get_database()
    users = database["users"] if database is not None else None
    credentials = database["credentials"] if database is not None else None
    clean_email = email.lower().strip()
    if users is not None and credentials is not None:
        credential = credentials.find_one({"email": clean_email})
        user = users.find_one({"id": credential.get("user_id")}) if credential else None
        if user is None:
            legacy_user = users.find_one({"email": clean_email})
            if legacy_user and legacy_user.get("password_hash"):
                user = legacy_user
                credential = {
                    "user_id": legacy_user["id"],
                    "email": clean_email,
                    "password_hash": legacy_user["password_hash"],
                }
        if user is None:
            credential = next((item for item in memory_store("credentials") if item["email"] == clean_email), None)
            user = next((item for item in memory_store("users") if item["id"] == credential["user_id"]), None) if credential else None
    else:
        credential = next((item for item in memory_store("credentials") if item["email"] == clean_email), None)
        user = next((item for item in memory_store("users") if item["id"] == credential["user_id"]), None) if credential else None
        if user is None:
            user = next((item for item in memory_store("users") if item["email"] == clean_email), None)
            if user and user.get("password_hash"):
                credential = {
                    "user_id": user["id"],
                    "email": clean_email,
                    "password_hash": user["password_hash"],
                }

    if not user or not credential or not _verify_password(password, credential.get("password_hash", "")):
        return None
    if credentials is not None and credentials.find_one({"email": clean_email}) is None:
        credentials.insert_one(credential)
        if "_id" in user:
            users.update_one({"_id": user["_id"]}, {"$unset": {"password_hash": ""}})
    if role and role != user.get("role"):
        user["role"] = role
        user["userType"] = role
        if users is not None:
            users.update_one({"_id": user["_id"]}, {"$set": {"role": role, "userType": role}})
    return public_user(user)


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    result = serialize(user)
    result.pop("created_at", None)
    if "preferred_language" not in result or not result["preferred_language"]:
        result["preferred_language"] = normalize_language_code(result.get("language", "en"))
    return result
