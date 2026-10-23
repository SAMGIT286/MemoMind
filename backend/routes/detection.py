from datetime import datetime, timezone
from io import BytesIO
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from services.observation_service import create_observations
from ai.face_recognition.recognizer import FaceRecognizer

router = APIRouter(prefix="/api/detection", tags=["detection"])


@lru_cache(maxsize=1)
def detector():
    from ai.object_detection.detector import ObjectDetector
    return ObjectDetector()


@lru_cache(maxsize=1)
def recognizer():
    return FaceRecognizer()


@router.get("/classes")
def get_supported_classes():
    """Return all known object classes supported by custom and COCO detectors."""
    custom_classes = ["Card", "Charger", "Earphones", "Glasses", "Keys", "Pen", "Phone", "Sunglasses", "Wallet", "Watch"]
    common_coco = ["Bottle", "Cup", "Laptop", "Mouse", "Keyboard", "Remote", "Book", "Clock", "Scissors", "Toothbrush", "Umbrella", "Bag", "Backpack", "Chair", "Sofa", "Table"]
    return {
        "custom_classes": custom_classes,
        "common_classes": sorted(list(set(custom_classes + common_coco))),
    }


@router.post("/image")
async def analyze_image(
    file: UploadFile = File(...),
    location: str | None = Form(default=None),
    person: str | None = Form(default=None),
    camera_id: str | None = Form(default=None),
    persist: bool = Form(default=True),
    include_objects: bool = Form(default=True),
    include_people: bool = Form(default=True),
):
    valid_content_types = {
        "image/jpeg", "image/jpg", "image/png", "image/webp",
        "image/pjpeg", "image/x-png", "image/bmp", "application/octet-stream"
    }
    content_type = (file.content_type or "").lower()
    if content_type not in valid_content_types and not content_type.startswith("image/"):
        raise HTTPException(415, "Upload a valid JPEG, PNG, BMP, or WebP image.")

    payload = await file.read()
    if len(payload) > 15 * 1024 * 1024:
        raise HTTPException(413, "Image must be smaller than 15 MB.")
    if len(payload) == 0:
        raise HTTPException(400, "Empty image file.")

    try:
        image = Image.open(BytesIO(payload)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "The uploaded file is not a valid image.")

    detections = []
    if include_objects:
        try:
            detections = detector().detect(image, include_people=include_people)
        except RuntimeError as exc:
            raise HTTPException(503, f"Object detection is unavailable: {exc}")

    people = []
    if include_people:
        try:
            people = recognizer().recognize(__import__("numpy").array(image))
        except RuntimeError as exc:
            # Face recognition failure shouldn't crash object detection
            people = []
        except Exception:
            people = []

    timestamp = datetime.now(timezone.utc)
    recognized_person = next((item["person"] for item in people if item["person"] != "Unknown"), person)

    object_observations = [
        {
            **item,
            "person": recognized_person,
            "location": location.strip() if location else None,
            "camera_id": camera_id,
            "timestamp": timestamp.isoformat(),
        }
        for item in detections
    ]
    person_observations = [
        {
            "object": "person",
            "person": item["person"],
            "confidence": item["confidence"],
            "bounding_box": item["bounding_box"],
            "model": "insightface",
            "location": location.strip() if location else None,
            "camera_id": camera_id,
            "timestamp": timestamp.isoformat(),
        }
        for item in people
        if item["person"] != "Unknown"
    ]

    if persist and (object_observations or person_observations):
        saved_all = create_observations(object_observations + person_observations)
        saved_observations = saved_all[:len(object_observations)]
    else:
        saved_observations = object_observations

    return {
        "timestamp": timestamp.isoformat(),
        "image_size": {"width": image.width, "height": image.height},
        "people": people,
        "detections": saved_observations,
    }


@router.post("/frame")
async def analyze_frame(
    file: UploadFile = File(...),
    location: str | None = Form(default=None),
    include_objects: bool = Form(default=True),
    include_people: bool = Form(default=True),
):
    return await analyze_image(
        file,
        location=location,
        persist=False,
        include_objects=include_objects,
        include_people=include_people,
    )

