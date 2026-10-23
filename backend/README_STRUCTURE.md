# MemoMind backend structure

Existing `main.py` is preserved. AI, database, model, route, and service folders are scaffolding for incremental integration.
Do not commit `.env`, face photos, `face_database.pkl`, or private credentials.

<!-- run the project -->
1.go to git bash 
activate the venv --> source .venv/Scripts/activate
You should see:
(.venv) SAMRUDDHI@... MINGW64 ~/.../MemoMind_Project_Structured

2.start the backend --> 
cd backend
python -m uvicorn main:app --reload --port 8000

3.start the frontend -->
cd frontend 
npm run dev 

