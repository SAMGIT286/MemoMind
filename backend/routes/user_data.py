from fastapi import APIRouter, HTTPException, Query

from models.user_data import UserDataReplace
from database.mongodb import collection, database_configured

router = APIRouter(prefix="/api/user-data", tags=["user-data"])
ALLOWED_RESOURCES = {"medicines", "appointments", "notifications", "chat"}


def _records(resource: str):
    if resource not in ALLOWED_RESOURCES:
        raise HTTPException(404, "Unknown user data resource.")
    records = collection("user_data")
    if records is None:
        if database_configured():
            raise HTTPException(503, "MongoDB is unavailable. User data was not saved.")
        raise HTTPException(503, "MongoDB is not configured.")
    return records


@router.get("/{resource}")
def get_user_data(resource: str, user_id: str = Query(min_length=1)):
    records = _records(resource)
    document = records.find_one({"user_id": user_id, "resource": resource})
    return {"items": document.get("items", []) if document else []}


@router.put("/{resource}")
def replace_user_data(resource: str, request: UserDataReplace, user_id: str = Query(min_length=1)):
    records = _records(resource)
    records.replace_one(
        {"user_id": user_id, "resource": resource},
        {"user_id": user_id, "resource": resource, "items": request.items},
        upsert=True,
    )
    return {"items": request.items}
