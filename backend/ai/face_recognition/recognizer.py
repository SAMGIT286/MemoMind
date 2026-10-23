import pickle
from pathlib import Path
from typing import Any

import numpy as np

DATABASE_PATH = Path(__file__).with_name("face_database.pkl")


class FaceRecognizer:
    def __init__(self, threshold: float = 0.45):
        self.threshold = threshold
        self.app: Any = None
        self.error: str | None = None
        self.embeddings: dict[str, np.ndarray] = {}
        try:
            with DATABASE_PATH.open("rb") as handle:
                database = pickle.load(handle)
            self.embeddings = {
                name: self._normalize(np.asarray(values, dtype=np.float32))
                for name, values in database.items()
            }
            from insightface.app import FaceAnalysis
            self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
        except (OSError, ImportError, RuntimeError, ValueError, EOFError) as exc:
            self.error = str(exc)

    @staticmethod
    def _normalize(values: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(values, axis=-1, keepdims=True)
        return values / np.maximum(norms, 1e-12)

    def recognize(self, image: np.ndarray) -> list[dict[str, Any]]:
        if self.app is None:
            raise RuntimeError(self.error or "Face recognition is unavailable")
        results = []
        for face in self.app.get(image):
            embedding = self._normalize(np.asarray(face.normed_embedding, dtype=np.float32))
            best_name = "Unknown"
            best_score = 0.0
            for name, enrolled in self.embeddings.items():
                score = float(np.max(enrolled @ embedding))
                if score > best_score:
                    best_name, best_score = name, score
            if best_score < self.threshold:
                best_name = "Unknown"
            results.append({
                "person": best_name,
                "confidence": best_score,
                "bounding_box": [float(value) for value in face.bbox.tolist()],
                "model": "insightface",
            })
        return results
