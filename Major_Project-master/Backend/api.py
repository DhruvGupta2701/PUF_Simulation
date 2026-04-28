"""
api.py – FastAPI backend for PUF ML Attack experiments.

Run:
    uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

from main import run_experiment
import database

app = FastAPI(
    title="PUF ML Attack API",
    description="Simulate XOR Arbiter PUFs and run ML modelling attacks.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the simple database
database.init_db()

class AuthRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None


class RenameSessionRequest(BaseModel):
    username: str
    old_name: str
    new_name: str

class DeleteSessionRequest(BaseModel):
    username: str
    session_name: str

class ExperimentRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    n_stages: int = Field(default=64, ge=8, le=256)
    xor_level: int = Field(default=2, ge=1, le=8)
    noise: float = Field(default=0.0, ge=0.0, le=1.0)
    num_samples: int = Field(default=10000, ge=100, le=200000)
    seed: int = Field(default=42)
    model_type: str = Field(default="lr", pattern="^(lr|mlp|svm|rf)$")
    username: Optional[str] = None
    session_name: Optional[str] = "Session 1"


class ExperimentResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    accuracy: float
    model_type: str
    n_stages: int
    xor_level: int
    noise: float
    num_samples: int
    seed: int


@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/register", response_model=AuthResponse)
def register(request: AuthRequest):
    success = database.register_user(request.username, request.password)
    if success:
        return AuthResponse(success=True, message="User registered successfully")
    return AuthResponse(success=False, message="Username already exists")

@app.post("/login", response_model=AuthResponse)
def login(request: AuthRequest):
    if database.authenticate_user(request.username, request.password):
        # We are using a simple token = username to keep it simple locally
        return AuthResponse(success=True, message="Login successful", token=request.username)
    return AuthResponse(success=False, message="Invalid username or password")

@app.get("/history/{username}")
def get_user_history(username: str):
    return {"history": database.get_history(username)}

@app.put("/rename-session")
def rename_session(request: RenameSessionRequest):
    success = database.rename_session(request.username, request.old_name, request.new_name)
    if success:
        return {"success": True, "message": "Session renamed successfully"}
    raise HTTPException(status_code=500, detail="Failed to rename session")

@app.delete("/delete-session")
def delete_session(request: DeleteSessionRequest):
    success = database.delete_session(request.username, request.session_name)
    if success:
        return {"success": True, "message": "Session deleted successfully"}
    raise HTTPException(status_code=500, detail="Failed to delete session")

@app.post("/run", response_model=ExperimentResponse)
def run(request: ExperimentRequest):
    try:
        req_dict = request.model_dump()
        accuracy = run_experiment(req_dict)
        if request.username:
            database.save_history(request.username, req_dict, accuracy)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ExperimentResponse(
        accuracy=accuracy,
        model_type=request.model_type,
        n_stages=request.n_stages,
        xor_level=request.xor_level,
        noise=request.noise,
        num_samples=request.num_samples,
        seed=request.seed,
    )
