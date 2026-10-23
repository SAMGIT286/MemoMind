# pyrefly: ignore[missing-import]
from fastapi import APIRouter, HTTPException, Query

from models.user_data import UserDataReplace
from database.mongodb import collection, database_configured, memory_store

router = APIRouter(prefix="/api/user-data", tags=["user-data"])
ALLOWED_RESOURCES = {"medicines", "appointments", "notifications", "chat"}


@router.get("/{resource}")
def get_user_data(resource: str, user_id: str = Query(min_length=1)):
    if resource not in ALLOWED_RESOURCES:
        raise HTTPException(404, "Unknown user data resource.")
    records = collection("user_data")
    if records is not None:
        try:
            document = records.find_one({"user_id": user_id, "resource": resource})
            return {"items": document.get("items", []) if document else []}
        except Exception:
            pass
    store = memory_store("user_data")
    entry = next((item for item in store if item.get("user_id") == user_id and item.get("resource") == resource), None)
    return {"items": entry.get("items", []) if entry else []}


@router.put("/{resource}")
def replace_user_data(resource: str, request: UserDataReplace, user_id: str = Query(min_length=1)):
    if resource not in ALLOWED_RESOURCES:
        raise HTTPException(404, "Unknown user data resource.")
    records = collection("user_data")
    if records is not None:
        try:
            records.replace_one(
                {"user_id": user_id, "resource": resource},
                {"user_id": user_id, "resource": resource, "items": request.items},
                upsert=True,
            )
            return {"items": request.items}
        except Exception:
            pass
    store = memory_store("user_data")
    entry = next((item for item in store if item.get("user_id") == user_id and item.get("resource") == resource), None)
    if entry:
        entry["items"] = request.items
    else:
        store.append({"user_id": user_id, "resource": resource, "items": request.items})
    return {"items": request.items}

