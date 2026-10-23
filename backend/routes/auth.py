# pyrefly: ignore [missing-import]
from bson import ObjectId
# pyrefly: ignore [missing-import]
from bson.errors import InvalidId
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException

from database.mongodb import collection, database_configured, memory_store
# pyrefly: ignore [missing-import]
from models.translation import get_language_display_name, normalize_language_code
from models.user import UserCreate, UserLogin
from services.user_service import authenticate_user, create_user, public_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_filter(user_id: str) -> dict:
    filters = [{"id": user_id}]
    try:
        filters.append({"_id": ObjectId(user_id)})
    except InvalidId:
        pass
    return {"$or": filters}


@router.post("/register", status_code=201)
def register(request: UserCreate):
    try:
        user = create_user(request.model_dump())
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    if user is None:
        raise HTTPException(409, "An account with this email already exists.")
    return {"user": user}


@router.post("/login")
def login(request: UserLogin):
    try:
        user = authenticate_user(request.email, request.password, request.role)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    if user is None:
        raise HTTPException(401, "Invalid email or password.")
    return {"user": user}


@router.patch("/{user_id}")
def update_profile(user_id: str, patch: dict):
    allowed = {
        "name", "phone", "dob", "age", "gender", "language", "preferred_language",
        "timezone", "location", "caregiver", "emergencyContacts", "doctor",
        "routine", "preferences", "setupComplete", "photoUrl", "role", "userType"
    }
    changes = {key: value for key, value in patch.items() if key in allowed}
    if not changes:
        raise HTTPException(400, "No supported profile fields were supplied.")

    if "preferred_language" in changes or "language" in changes:
        raw = changes.get("preferred_language") or changes.get("language")
        pref_code = normalize_language_code(raw)
        disp_name = get_language_display_name(pref_code)
        changes["preferred_language"] = pref_code
        changes["language"] = disp_name
        current_prefs = changes.get("preferences") or {}
        if isinstance(current_prefs, dict):
            current_prefs["language"] = disp_name
            current_prefs["preferred_language"] = pref_code
            changes["preferences"] = current_prefs

    records = collection("users")
    if records is None:
        users = memory_store("users")
        result = next((user for user in users if user["id"] == user_id), None)
        if result is None:
            raise HTTPException(404, "User not found.")
        result.update(changes)
    else:
        user_filter = _user_filter(user_id)
        records.update_one(user_filter, {"$set": changes})
        result = records.find_one(user_filter)

    if result is None:
        raise HTTPException(404, "User not found.")
    return {"user": public_user(result)}
