import os
import time
from datetime import datetime, timezone
from typing import Any

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

try:
    # pyrefly: ignore [missing-import]
    from pymongo import MongoClient
    # pyrefly: ignore [missing-import]
    from pymongo.errors import PyMongoError
except ImportError:  # pyright: ignore [reportMissingImports]
    MongoClient = None
    PyMongoError = Exception

_client = None
_database = None
_connection_failed = False
_last_attempt_time = 0

_memory_store: dict[str, list[dict[str, Any]]] = {
    "users": [],
    "credentials": [],
    "reminders": [],
    "memories": [],
    "observations": [],
    "user_data": [],
    "translations": [],
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_database():
    global _client, _database, _connection_failed, _last_attempt_time
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_DB_URL")
    if not uri or MongoClient is None:
        return None

    if _database is not None:
        return _database

    # If connection previously failed, wait at least 30s before re-attempting to avoid lag
    now = time.time()
    if _connection_failed and (now - _last_attempt_time < 30):
        return None

    _last_attempt_time = now
    try:
        client = MongoClient(
            uri,
            tls=True,
            retryReads=True,
            retryWrites=True,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
        )
        client.admin.command("ping")
        _client = client
        _database = client[os.getenv("DATABASE_NAME", "memoMind")]
        _connection_failed = False
        return _database
    except (PyMongoError, Exception):
        _connection_failed = True
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
        _client = None
        _database = None
        return None


def database_configured() -> bool:
    return bool(os.getenv("MONGODB_URI") or os.getenv("MONGO_DB_URL"))


def collection(name: str):
    database = get_database()
    return database[name] if database is not None else None


def memory_store(name: str) -> list[dict[str, Any]]:
    return _memory_store.setdefault(name, [])


def serialize(document: dict[str, Any]) -> dict[str, Any]:
    result = dict(document)
    if "_id" in result:
        result.pop("_id")
        if "id" not in result:
            result["id"] = str(document["_id"])
    return result


def ensure_indexes() -> None:
    database = get_database()
    if database is None:
        return
    try:
        database.observations.create_index("timestamp")
        database.observations.create_index("object")
        database.observations.create_index("person")
        database.reminders.create_index("due_at")
        database.memories.create_index("created_at")
        database.users.create_index("email", unique=True)
        database.credentials.create_index("email", unique=True)
        database.user_data.create_index([("user_id", 1), ("resource", 1)], unique=True)
        database.translations.create_index("content_hash", unique=True)
        database.translations.create_index("target_language")
        database.translations.create_index("translation_key")
    except (PyMongoError, Exception):
        if _client is not None:
            try:
                _client.close()
            except Exception:
                pass
        _reset_connection()


def _reset_connection() -> None:
    global _client, _database, _connection_failed
    _client = None
    _database = None
    _connection_failed = True
