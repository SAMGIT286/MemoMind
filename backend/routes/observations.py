from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel, Field

from services.observation_service import (
    list_observations,
    create_observations,
    delete_observation,
    clear_observations,
)

router = APIRouter(prefix="/api/observations", tags=["observations"])


class ManualObservationRequest(BaseModel):
    object: str = Field(min_length=1, max_length=100)
    location: str | None = Field(default=None, max_length=200)
    person: str | None = Field(default=None, max_length=100)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


@router.get("")
def get_observations(
    object_name: str | None = Query(default=None, alias="object"),
    person: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=200),
):
    return list_observations(object_name=object_name, person_name=person, limit=limit)


@router.get("/latest")
def get_latest_observations(limit: int = Query(default=15, ge=1, le=100)):
    return list_observations(limit=limit)


@router.get("/object/{object_name}")
def get_object_observations(object_name: str, limit: int | None = Query(default=None, ge=1, le=100)):
    return list_observations(object_name=object_name, limit=limit)


@router.get("/person/{person_name}")
def get_person_observations(person_name: str, limit: int | None = Query(default=None, ge=1, le=100)):
    return list_observations(person_name=person_name, limit=limit)


@router.post("")
def record_observation(data: ManualObservationRequest):
    item = {
        "object": data.object.strip().title(),
        "confidence": data.confidence,
        "location": data.location.strip() if data.location else None,
        "person": data.person.strip() if data.person else None,
        "model": "manual",
        "timestamp": datetime.now(timezone.utc),
    }
    saved = create_observations([item])
    return saved[0] if saved else item


@router.delete("/{observation_id}")
def remove_observation(observation_id: str):
    success = delete_observation(observation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Observation not found.")
    return {"deleted": True, "id": observation_id}


@router.delete("")
def clear_all_observations(object_name: str | None = Query(default=None, alias="object")):
    count = clear_observations(object_name=object_name)
    return {"cleared": True, "count": count}

