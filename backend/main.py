"""API del tablero. Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
from fastapi import FastAPI

from backend.datos_ejemplo import tablero

app = FastAPI(title="Hackathon NFL UNAM")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/tablero")
def obtener_tablero() -> dict:
    """Todo lo que necesita la página de analíticas de juego."""
    return tablero()
