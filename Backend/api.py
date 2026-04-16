"""
api.py – FastAPI backend for PUF ML Attack experiments.

Run:
    uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from main import run_experiment

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


class ExperimentRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    n_stages: int = Field(default=64, ge=8, le=256)
    xor_level: int = Field(default=2, ge=1, le=8)
    noise: float = Field(default=0.0, ge=0.0, le=1.0)
    num_samples: int = Field(default=10000, ge=100, le=200000)
    seed: int = Field(default=42)
    model_type: str = Field(default="lr", pattern="^(lr|mlp)$")


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


@app.post("/run", response_model=ExperimentResponse)
def run(request: ExperimentRequest):
    try:
        accuracy = run_experiment(request.model_dump())
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
