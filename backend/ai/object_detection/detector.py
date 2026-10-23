from pathlib import Path
from typing import Any
from io import BytesIO
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
CUSTOM_MODEL_PATH = Path(__file__).resolve().parent / "best.pt"
COCO_MODEL_PATH = BACKEND_DIR / "yolo11n.pt"

COCO_NAME_MAP = {
    "cell phone": "Phone",
    "wine glass": "Glass",
    "cup": "Cup",
    "bottle": "Bottle",
    "handbag": "Bag",
    "backpack": "Backpack",
    "laptop": "Laptop",
    "mouse": "Mouse",
    "keyboard": "Keyboard",
    "remote": "Remote",
    "book": "Book",
    "clock": "Clock",
    "scissors": "Scissors",
    "toothbrush": "Toothbrush",
    "umbrella": "Umbrella",
    "couch": "Sofa",
    "chair": "Chair",
    "dining table": "Table",
    "bed": "Bed",
    "potted plant": "Plant",
    "teddy bear": "Teddy Bear",
    "hair drier": "Hair Drier",
    "traffic light": "Traffic Light",
    "fire hydrant": "Fire Hydrant",
    "stop sign": "Stop Sign",
    "parking meter": "Parking Meter",
    "sports ball": "Sports Ball",
    "baseball bat": "Baseball Bat",
    "baseball glove": "Baseball Glove",
    "tennis racket": "Tennis Racket",
    "hot dog": "Hot Dog",
}


def _calculate_iou(box1: list[float], box2: list[float]) -> float:
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    if intersection <= 0:
        return 0.0

    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - intersection
    return intersection / union if union > 0 else 0.0


class ObjectDetector:
    def __init__(self, confidence: float = 0.20):
        self.confidence = confidence
        self.custom_model: Any = None
        self.coco_model: Any = None
        self.error: str | None = None
        try:
            from ultralytics import YOLO

            if CUSTOM_MODEL_PATH.is_file():
                try:
                    self.custom_model = YOLO(str(CUSTOM_MODEL_PATH))
                except Exception as exc:
                    print(f"Warning: Could not load custom model {CUSTOM_MODEL_PATH}: {exc}")

            coco_target = str(COCO_MODEL_PATH) if COCO_MODEL_PATH.is_file() else "yolo11n.pt"
            try:
                self.coco_model = YOLO(coco_target)
            except Exception as exc:
                print(f"Warning: Could not load COCO model {coco_target}: {exc}")

            if self.custom_model is None and self.coco_model is None:
                self.error = "Neither custom nor standard YOLO models could be loaded."

        except (ImportError, OSError, RuntimeError) as exc:
            self.error = str(exc)

    @property
    def model(self) -> Any:
        """Backwards compatibility property for callers checking detector.model."""
        return self.custom_model or self.coco_model

    @property
    def is_loaded(self) -> bool:
        return self.custom_model is not None or self.coco_model is not None

    def detect(self, image: Any, include_people: bool = False) -> list[dict[str, Any]]:
        if self.custom_model is None and self.coco_model is None:
            raise RuntimeError(self.error or "YOLO model is unavailable")

        if isinstance(image, bytes):
            image = Image.open(BytesIO(image))
        if hasattr(image, "convert") and getattr(image, "mode", "") != "RGB":
            image = image.convert("RGB")

        candidates: list[dict[str, Any]] = []

        # 1. Run custom fine-tuned model for specific items (Cards, Keys, Charger, Glasses, Wallet, Phone, etc.)
        if self.custom_model is not None:
            try:
                results = self.custom_model.predict(
                    image,
                    conf=self.confidence,
                    imgsz=640,
                    max_det=25,
                    verbose=False,
                )
                for result in results:
                    names = result.names
                    for box in result.boxes:
                        confidence = round(float(box.conf[0]), 3)
                        coords = [round(float(val), 1) for val in box.xyxy[0].tolist()]
                        class_id = int(box.cls[0])
                        raw_name = str(names[class_id])
                        candidates.append({
                            "object": raw_name.title(),
                            "confidence": confidence,
                            "bounding_box": coords,
                            "model": "yolo-custom",
                        })
            except Exception as exc:
                print(f"Custom model inference error: {exc}")

        # 2. Run general COCO YOLO model for broad object detection (bottle, cup, laptop, book, etc.)
        if self.coco_model is not None:
            try:
                results = self.coco_model.predict(
                    image,
                    conf=self.confidence,
                    imgsz=640,
                    max_det=30,
                    verbose=False,
                )
                for result in results:
                    names = result.names
                    for box in result.boxes:
                        confidence = round(float(box.conf[0]), 3)
                        coords = [round(float(val), 1) for val in box.xyxy[0].tolist()]
                        class_id = int(box.cls[0])
                        raw_name = str(names[class_id]).lower()

                        if raw_name == "person" and not include_people:
                            continue

                        formatted_name = COCO_NAME_MAP.get(raw_name, raw_name.title())
                        candidates.append({
                            "object": formatted_name,
                            "confidence": confidence,
                            "bounding_box": coords,
                            "model": "yolo-coco",
                        })
            except Exception as exc:
                print(f"COCO model inference error: {exc}")

        # 3. Non-Maximum Suppression (NMS) / IoU deduplication
        candidates.sort(key=lambda item: item["confidence"], reverse=True)

        final_detections: list[dict[str, Any]] = []
        for cand in candidates:
            duplicate = False
            for accepted in final_detections:
                iou = _calculate_iou(cand["bounding_box"], accepted["bounding_box"])
                if iou > 0.40:
                    duplicate = True
                    break
            if not duplicate:
                cand["model"] = "yolo"
                final_detections.append(cand)

        return final_detections
