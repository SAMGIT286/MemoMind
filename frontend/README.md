# MemoMind Frontend

React + Vite frontend for MemoMind.

## Run the frontend

```bash
npm install
npm run dev
```

The frontend uses `http://localhost:8000` for the FastAPI backend by default. To change it, create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:8000
```

## Run the backend

From the backend folder:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Make sure the backend `.env` contains the OpenRouter configuration used by `main.py`.

## Implemented

- Login/register with browser persistence
- Multi-step onboarding with completion state
- Dashboard with live medicine actions and recent memories
- Medicine add/edit/delete/mark-as-taken
- Appointment add/edit/delete
- Memory timeline with month navigation and delete
- Persistent notifications
- Functional settings, JSON data export and local account deletion
- AI Assistant connected to `POST /api/chat`
- Conversation history and current medicine/appointment/memory records passed to the backend
- Browser voice input and text-to-speech where supported
- Responsive desktop/mobile layout

`public/` and `dist/` are preserved as supplied and are not modified by this implementation.
