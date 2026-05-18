@echo off
echo Starting Backend (FastAPI)...
start cmd /k "cd Backend && python -m uvicorn api:app --reload"

echo Starting Frontend (Vite/React)...
start cmd /k "cd Frontend && (if not exist node_modules npm install) & npm run dev"

echo Both servers are starting up!
echo Your frontend will be available at http://localhost:3000
