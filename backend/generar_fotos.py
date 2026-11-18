"""Genera backend/fotos_jugadores.csv: el índice nflId → foto de cada jugador del dataset.

Herramienta de desarrollo: se corre una sola vez y el CSV resultante se guarda en el
repositorio, así la app no depende de descargar nada al arrancar.

Fuente: tabla de jugadores de nflverse (gratuita y abierta). Su columna `nfl_id` es el
mismo ID que usa el Big Data Bowl; `espn_id` sirve para las fotos de ESPN y `headshot`
es la foto oficial de NFL.com.

    .venv\\Scripts\\python -m backend.generar_fotos
"""
import urllib.request
from io import BytesIO
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv"
SALIDA = Path(__file__).resolve().parent / "fotos_jugadores.csv"


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": "hackathon-client"})
    with urllib.request.urlopen(req, timeout=60) as r:
        nv = pd.read_csv(BytesIO(r.read()), dtype=str)
    nv["nfl_id"] = pd.to_numeric(nv["nfl_id"], errors="coerce")
    nv = nv.dropna(subset=["nfl_id"]).drop_duplicates("nfl_id")

    ids = pd.read_csv(RAIZ / "data" / "players.csv", usecols=["nflId"])
    t = ids.merge(nv[["nfl_id", "espn_id", "headshot"]], left_on="nflId", right_on="nfl_id", how="left")
    t = t[["nflId", "espn_id", "headshot"]].dropna(subset=["espn_id", "headshot"], how="all")
    t["espn_id"] = pd.to_numeric(t["espn_id"], errors="coerce").astype("Int64")
    t.to_csv(SALIDA, index=False)
    print(f"{len(t)} de {len(ids)} jugadores con foto, guardado en {SALIDA.name}")


if __name__ == "__main__":
    main()
