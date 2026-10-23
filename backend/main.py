import os
import logging
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from routes.auth import router as auth_router
from routes.detection import router as detection_router
from routes.observations import router as observations_router
from routes.translations import router as translations_router
from routes.user_data import router as user_data_router

load_dotenv()

# --------------------------------------------------
# Configuration
# --------------------------------------------------

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434"
).rstrip("/")

# Change this if `ollama list` shows a different Phi model.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3")

OLLAMA_TIMEOUT = float(
    os.getenv("OLLAMA_TIMEOUT", "180")
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("memomind")

app = FastAPI(
    title="MemoMind API",
    description="Local AI memory assistant powered by Ollama and Phi",
    version="1.0.0",
)

app.include_router(auth_router)
app.include_router(detection_router)
app.include_router(observations_router)
app.include_router(user_data_router)
app.include_router(translations_router)

# --------------------------------------------------
# CORS
# --------------------------------------------------

# Add your frontend origin to FRONTEND_ORIGINS in .env
# if your frontend uses a different port or host.
origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Request and response models
# --------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.get("/")
async def root():
    return {
        "message": "Welcome to MemoMind API",
        "status": "running",
        "model": OLLAMA_MODEL,
    }


@app.get("/health")
async def health():
    """Check whether the local Ollama service is reachable."""
    try:
        async with httpx.AsyncClient(
            timeout=5.0
        ) as client:
            response = await client.get(
                f"{OLLAMA_URL}/api/tags"
            )
            response.raise_for_status()

        models = response.json().get("models", [])
        installed_models = [
            model.get("name", "")
            for model in models
        ]

        model_available = any(
            name == OLLAMA_MODEL
            or name.startswith(OLLAMA_MODEL + ":")
            for name in installed_models
        )

        return {
            "status": "ok",
            "ollama_connected": True,
            "model": OLLAMA_MODEL,
            "model_available": model_available,
            "installed_models": installed_models,
        }

    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Health check failed: %s", exc)
        return {
            "status": "degraded",
            "ollama_connected": False,
            "model": OLLAMA_MODEL,
            "detail": "Ollama is unavailable. Check that it is running.",
        }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the locally running Phi model."""

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    messages = [
        {
            "role": "system",
            "content": (
                "You are MemoMind, a helpful personal memory "
                "assistant. Help users organize information, "
                "summarize notes, recall details provided in the "
                "conversation, and plan tasks. Be clear, supportive, "
                "and honest. Do not claim to remember information "
                "from previous sessions unless it is supplied in "
                "the current conversation or retrieved from storage. "
                "If information is missing, ask the user for it."
            ),
        }
    ]

    # Keep only valid recent conversation messages.
    # History is supplied by the frontend; this endpoint does
    # not permanently store conversations.
    for item in request.history[-20:]:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = item.get("content")

        if (
            role in ("user", "assistant")
            and isinstance(content, str)
            and content.strip()
        ):
            messages.append({
                "role": role,
                "content": content[:10000],
            })

    messages.append({
        "role": "user",
        "content": message,
    })

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(
            timeout=OLLAMA_TIMEOUT
        ) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json=payload,
            )

            response.raise_for_status()
            data = response.json()

        reply = data.get("message", {}).get("content", "")

        if not isinstance(reply, str) or not reply.strip():
            logger.error("Ollama returned an empty response.")
            raise HTTPException(
                status_code=502,
                detail="The AI model returned an empty response.",
            )

        return ChatResponse(reply=reply.strip())

    except httpx.TimeoutException:
        logger.warning("Ollama request timed out.")
        raise HTTPException(
            status_code=504,
            detail="The AI model took too long to respond. Please try again.",
        )

    except httpx.HTTPStatusError as exc:
        logger.error(
            "Ollama returned HTTP %s",
            exc.response.status_code,
        )

        if exc.response.status_code == 404:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Model '{OLLAMA_MODEL}' may not be installed. "
                    "Check `ollama list` and your OLLAMA_MODEL setting."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail="Ollama returned an error while generating a response.",
        )

    except httpx.RequestError:
        logger.exception("Could not connect to Ollama.")
        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot connect to Ollama. Make sure Ollama is installed "
                "and running on this computer."
            ),
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )