"""API del tablero. Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
import csv
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse

from backend.pipeline_coverage_triage import buscar_jugadas, caso_por_id, procesar_todo

# Índice nflId → foto (generado una vez con backend/generar_fotos.py a partir de nflverse)
_FOTOS: dict[int, tuple[str, str]] = {}
with open(Path(__file__).resolve().parent / "fotos_jugadores.csv", encoding="utf-8") as _f:
    for _fila in csv.DictReader(_f):
        _FOTOS[int(_fila["nflId"])] = (_fila["espn_id"], _fila["headshot"])

# Estado del cálculo de TouchWay. Se calcula en un hilo al arrancar para que
# /health responda de inmediato; nada se escribe en disco.
_coverage: dict = {"estado": "calculando", "progreso": 0.0}


def _calcular_coverage() -> None:
    global _coverage

    def avance(p: float) -> None:
        globals()["_coverage"] = {"estado": "calculando", "progreso": round(p, 3)}

    try:
        datos = procesar_todo(avance)
        _coverage = {"estado": "listo", **datos}
    except Exception as e:  # el resto de la app sigue funcionando aunque esto falle
        _coverage = {"estado": "error", "mensaje": f"{type(e).__name__}: {e}"}


@asynccontextmanager
async def lifespan(_: FastAPI):
    threading.Thread(target=_calcular_coverage, daemon=True).start()
    yield


app = FastAPI(title="Hackathon NFL UNAM", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/foto/{nfl_id}")
def foto_jugador(nfl_id: int, tam: str = "grande") -> RedirectResponse:
    """Redirige a la foto del jugador: ESPN (recortada y redimensionada) o, si falta, NFL.com.

    tam=mini pide una versión pequeña para las listas. El navegador descarga la imagen
    directo de la fuente; el servidor no la baja ni la guarda.
    """
    w, h = (120, 87) if tam == "mini" else (350, 254)
    espn, nfl = _FOTOS.get(nfl_id, ("", ""))
    if espn:
        url = f"https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/{espn}.png&w={w}&h={h}"
    elif nfl:
        url = nfl.replace("f_auto,q_auto", f"f_auto,q_auto,w_{w}")
    else:
        raise HTTPException(status_code=404, detail="Sin foto")
    return RedirectResponse(url, status_code=307, headers={"Cache-Control": "public, max-age=86400"})


def _exigir_listo() -> None:
    if _coverage.get("estado") != "listo":
        raise HTTPException(status_code=503, detail="Todavía se están calculando las analíticas")


@app.get("/api/jugadas")
def listar_jugadas(q: str = "", equipo: str = "", tipo: str = "", resultado: str = "", limite: int = 60) -> dict:
    """Buscador: resumen de las evaluaciones defensor-jugada que cumplen los filtros."""
    _exigir_listo()
    return buscar_jugadas(q=q, equipo=equipo, tipo=tipo, resultado=resultado, limite=limite)


@app.get("/api/jugada/{game_id}/{play_id}/{nfl_id}")
def obtener_jugada(game_id: int, play_id: int, nfl_id: int) -> dict:
    """Frames completos de una jugada para el visor, calculados al momento."""
    _exigir_listo()
    caso = caso_por_id(game_id, play_id, nfl_id)
    if caso is None:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return caso


@app.get("/api/coverage")
def obtener_coverage() -> dict:
    """Todo lo que necesita la página. Mientras se calcula devuelve estado y progreso."""
    return _coverage
