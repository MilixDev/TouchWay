"""TouchWay: ¿a quién cubrir?

Pipeline vectorizado (pandas + numpy) sobre los datos del NFL Big Data Bowl 2023
(temporada 2021, semanas 1-8) que hay en data/.

Para cada jugada de pase (completo, incompleto o intercepción) toma los frames entre el
snap y el lanzamiento (10 Hz) y calcula:

* IPC (Índice de Prioridad de Cobertura, 0-1) de cada receptor, visto desde cada defensor
  en cobertura:  IPC = 0.45·Orfandad + 0.35·Mirada del QB + 0.20·Peligro de 1.er down.
* CTI (Coverage Triage Index, -1 a +1) de cada defensor en cada jugada: el coseno entre su
  velocidad y la dirección hacia el receptor de mayor IPC de su zona, promediado y ponderado
  por ese IPC durante el último segundo antes del pase.

Todo se calcula en memoria al arrancar; no escribe archivos. Para probarlo desde la consola:

    .venv\\Scripts\\python -m backend.pipeline_coverage_triage
"""
from __future__ import annotations

import math
import threading
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"

# Parámetros del modelo
RADIO_ZONA = 15.0          # yardas: receptores que "pertenecen" a la zona del defensor
ESCALA_ORFANDAD = 8.0      # yardas: a esta distancia del otro defensor más cercano, O = 1
VENTANA = 10               # frames (1.0 s a 10 Hz) antes del lanzamiento
VEL_MINIMA = 0.5           # yd/s: por debajo, el defensor no "se dirige" a nadie (coseno 0)
MIN_FRAMES_VENTANA = 5
MIN_JUGADAS_LEADERBOARD = 60
UMBRAL_ELITE = 0.25
UMBRAL_SENUELO = -0.15
UMBRAL_KPI = 0.20
N_CASOS_POR_LADO = 6
MAX_RESULTADOS = 60

POS_COBERTURA = {"CB", "FS", "SS", "DB", "LB", "ILB", "OLB", "MLB"}
EVENTOS_SNAP = {"ball_snap", "autoevent_ballsnap"}
EVENTOS_PASE = ["pass_forward", "autoevent_passforward", "pass_arrived"]  # en orden de preferencia
COLUMNAS_TRACKING = ["gameId", "playId", "nflId", "frameId", "jerseyNumber", "team",
                     "playDirection", "x", "y", "s", "o", "dir", "event"]

ROL_QB, ROL_RUTA, ROL_COBERTURA, ROL_DEFENSA = 1, 2, 3, 4


def estatus(ipc: float) -> str:
    if ipc >= 0.65:
        return "PRIORIDAD"
    if ipc >= 0.40:
        return "ALERTA"
    return "SEÑUELO"


def veredicto(cti: float) -> str:
    if cti > UMBRAL_ELITE:
        return "Lectura Élite"
    if cti < UMBRAL_SENUELO:
        return "Mordió el Señuelo"
    return "Lectura Neutral"


# --------------------------------------------------------------------------------------
# Carga de tablas pequeñas
# --------------------------------------------------------------------------------------

def cargar_contexto() -> dict:
    plays = pd.read_csv(DATA / "plays.csv")
    # Pases reales sin castigo (un castigo cambia las yardas y el resultado de la jugada)
    plays = plays[plays["passResult"].isin(["C", "I", "IN"]) & plays["penaltyYards"].isna()].copy()
    umbral = np.select([plays["down"] == 1, plays["down"] == 2], [0.4, 0.6], 1.0) * plays["yardsToGo"]
    plays["exito"] = plays["playResult"] >= umbral

    players = pd.read_csv(DATA / "players.csv")[["nflId", "officialPosition", "displayName"]]

    pff = pd.read_csv(DATA / "pffScoutingData.csv", usecols=["gameId", "playId", "nflId", "pff_role"])
    pff = pff.merge(players[["nflId", "officialPosition"]], on="nflId", how="left")
    rol = np.select(
        [pff["pff_role"] == "Pass", pff["pff_role"] == "Pass Route",
         (pff["pff_role"] == "Coverage") & pff["officialPosition"].isin(POS_COBERTURA)],
        [ROL_QB, ROL_RUTA, ROL_COBERTURA], 0,
    )
    pff["rol"] = rol.astype(np.int8)
    games = pd.read_csv(DATA / "games.csv")[["gameId", "week", "homeTeamAbbr", "visitorTeamAbbr"]]
    return {"plays": plays, "players": players, "games": games,
            "roles": pff[["gameId", "playId", "nflId", "rol"]]}


# --------------------------------------------------------------------------------------
# Lectura y recorte de un partido
# --------------------------------------------------------------------------------------

def leer_partido(ruta: Path, ctx: dict) -> pd.DataFrame:
    """Frames snap→lanzamiento de las jugadas de pase de un partido, normalizados a la derecha."""
    tr = pd.read_csv(ruta, usecols=COLUMNAS_TRACKING,
                     dtype={"x": np.float32, "y": np.float32, "s": np.float32,
                            "o": np.float32, "dir": np.float32})
    game_id = int(tr["gameId"].iloc[0])
    plays = ctx["plays"][ctx["plays"]["gameId"] == game_id]
    tr = tr[tr["playId"].isin(plays["playId"])]
    if tr.empty:
        return tr

    # Frame del snap y del lanzamiento por jugada
    ev = tr.loc[tr["event"].notna() & (tr["event"] != "None"), ["playId", "frameId", "event"]].drop_duplicates()
    snap = ev[ev["event"].isin(EVENTOS_SNAP)].groupby("playId")["frameId"].min().rename("snap")
    pase = None
    for nombre in EVENTOS_PASE:
        f = ev[ev["event"] == nombre].groupby("playId")["frameId"].min()
        pase = f if pase is None else pase.combine_first(f)
    if pase is None or pase.empty:
        return tr.iloc[0:0]
    ventanas = pd.concat([snap, pase.rename("pase")], axis=1).dropna()
    ventanas = ventanas[ventanas["pase"] - ventanas["snap"] >= VENTANA]
    tr = tr.merge(ventanas, left_on="playId", right_index=True)
    tr = tr[(tr["frameId"] >= tr["snap"]) & (tr["frameId"] <= tr["pase"])]

    # Normaliza la dirección: la ofensiva siempre ataca hacia x creciente
    izq = (tr["playDirection"] == "left").to_numpy()
    tr["x"] = np.where(izq, 120 - tr["x"], tr["x"]).astype(np.float32)
    tr["y"] = np.where(izq, 53.3 - tr["y"], tr["y"]).astype(np.float32)
    tr["o"] = np.where(izq, (tr["o"] + 180) % 360, tr["o"]).astype(np.float32)
    tr["dir"] = np.where(izq, (tr["dir"] + 180) % 360, tr["dir"]).astype(np.float32)

    # Rol de cada jugador y lado
    p = plays[["playId", "defensiveTeam", "absoluteYardlineNumber", "yardsToGo"]]
    tr = tr.merge(p, on="playId")
    tr = tr.merge(ctx["roles"][ctx["roles"]["gameId"] == game_id].drop(columns="gameId"),
                  on=["playId", "nflId"], how="left")
    tr["rol"] = tr["rol"].fillna(0).astype(np.int8)
    defensa = (tr["team"] == tr["defensiveTeam"]).to_numpy()
    tr.loc[defensa & (tr["rol"] != ROL_COBERTURA), "rol"] = ROL_DEFENSA
    los = np.where(izq, 120 - tr["absoluteYardlineNumber"], tr["absoluteYardlineNumber"])
    tr["los"] = los.astype(np.float32)
    tr["primerDown"] = (tr["los"] + tr["yardsToGo"]).astype(np.float32)
    return tr.sort_values(["playId", "nflId", "frameId"], kind="stable")


# --------------------------------------------------------------------------------------
# Núcleo matemático (una jugada)
# --------------------------------------------------------------------------------------

def unitario_ngs(grados: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """0° = norte (+y), 90° = este (+x), sentido horario."""
    r = np.deg2rad(grados)
    return np.sin(r), np.cos(r)


def matrices_jugada(g: pd.DataFrame) -> dict | None:
    """Convierte las filas de una jugada en matrices (jugador × frame)."""
    jugadores = g[g["nflId"].notna()]
    if jugadores.empty:
        return None
    frames = np.sort(jugadores["frameId"].unique())
    ids, p_idx = np.unique(jugadores["nflId"].to_numpy(), return_inverse=True)
    f_idx = np.searchsorted(frames, jugadores["frameId"].to_numpy())
    P, F = len(ids), len(frames)

    def matriz(col: str) -> np.ndarray:
        m = np.full((P, F), np.nan, dtype=np.float32)
        m[p_idx, f_idx] = jugadores[col].to_numpy()
        return m

    roles = np.zeros(P, dtype=np.int8)
    roles[p_idx] = jugadores["rol"].to_numpy()
    primera = jugadores.iloc[0]
    return {
        "ids": ids, "frames": frames, "roles": roles,
        "X": matriz("x"), "Y": matriz("y"), "S": matriz("s"), "O": matriz("o"), "DIR": matriz("dir"),
        "los": float(primera["los"]), "primerDown": float(primera["primerDown"]),
    }


def ipc_jugada(m: dict) -> dict | None:
    """IPC de cada receptor visto desde cada defensor en cobertura: (nR, nC, F)."""
    roles = m["roles"]
    qb = np.flatnonzero(roles == ROL_QB)
    rec = np.flatnonzero(roles == ROL_RUTA)
    defensa = np.flatnonzero((roles == ROL_COBERTURA) | (roles == ROL_DEFENSA))
    cob_en_def = np.flatnonzero(roles[defensa] == ROL_COBERTURA)
    if len(qb) != 1 or len(rec) == 0 or len(cob_en_def) == 0 or len(defensa) < 2:
        return None
    X, Y = m["X"], m["Y"]

    # Distancias receptor-defensor (nR, nD, F)
    dx = X[rec][:, None, :] - X[defensa][None, :, :]
    dy = Y[rec][:, None, :] - Y[defensa][None, :, :]
    dist = np.sqrt(dx * dx + dy * dy)
    dist = np.where(np.isnan(dist), np.inf, dist)

    # Orfandad: distancia al defensor más cercano distinto del evaluado
    orden = np.argsort(dist, axis=1)
    d1 = np.take_along_axis(dist, orden[:, :1, :], axis=1)[:, 0, :]
    d2 = np.take_along_axis(dist, orden[:, 1:2, :], axis=1)[:, 0, :]
    a1 = orden[:, 0, :]
    d_otro = np.where(a1[:, None, :] == cob_en_def[None, :, None], d2[:, None, :], d1[:, None, :])
    orf = np.clip(d_otro / ESCALA_ORFANDAD, 0.1, 1.0)

    # Mirada del QB
    ux, uy = unitario_ngs(m["O"][qb[0]])
    vx = X[rec] - X[qb[0]]
    vy = Y[rec] - Y[qb[0]]
    norma = np.sqrt(vx * vx + vy * vy)
    norma = np.where(norma < 1e-6, np.nan, norma)
    dot = np.nan_to_num((vx * ux + vy * uy) / norma, nan=0.0)
    mirada = np.clip((dot + 1) / 2, 0.2, 1.0)

    # Peligro de 1.er down
    los, fd = m["los"], m["primerDown"]
    xr = X[rec]
    limite = fd - 2.0
    if limite <= los:
        z = np.where(xr > los, 1.0, 0.3)
    else:
        z = 0.3 + 0.7 * (xr - los) / (limite - los)
    z = np.clip(np.nan_to_num(z, nan=0.3), 0.3, 1.0)

    ipc = np.clip(0.45 * orf + 0.35 * mirada[:, None, :] + 0.20 * z[:, None, :], 0.0, 1.0)
    cob = defensa[cob_en_def]
    zona = dist[:, cob_en_def, :] <= RADIO_ZONA
    return {"ipc": ipc.astype(np.float32), "zona": zona, "rec": rec, "cob": cob, "qb": qb[0],
            "dist_rc": dist[:, cob_en_def, :], "orf": orf, "mirada": mirada, "z": z}


def cti_jugada(m: dict, r: dict) -> list[dict]:
    """CTI de cada defensor en cobertura en el último segundo antes del pase."""
    ipc, zona, rec, cob = r["ipc"], r["zona"], r["rec"], r["cob"]
    F = ipc.shape[2]
    t = np.arange(F - VENTANA, F)
    ipc_v = np.where(zona[:, :, t], ipc[:, :, t], -1.0)            # (nR, nC, T)
    estrella = np.argmax(ipc_v, axis=0)                            # (nC, T)
    ipc_max = np.max(ipc_v, axis=0)                                # (nC, T)
    valido = ipc_max >= 0

    X, Y = m["X"], m["Y"]
    rx = X[rec][estrella, t[None, :]]                              # (nC, T)
    ry = Y[rec][estrella, t[None, :]]
    cx, cy = X[cob][:, t], Y[cob][:, t]
    s = m["S"][cob][:, t]
    sx, sy = unitario_ngs(m["DIR"][cob][:, t])
    hx, hy = rx - cx, ry - cy
    nh = np.sqrt(hx * hx + hy * hy)
    coseno = np.where((s >= VEL_MINIMA) & (nh > 1e-3), (sx * hx + sy * hy) / np.maximum(nh, 1e-3), 0.0)
    coseno = np.nan_to_num(coseno, nan=0.0)
    valido &= ~np.isnan(cx)

    salida = []
    for j in range(len(cob)):
        v = valido[j]
        if v.sum() < MIN_FRAMES_VENTANA:
            continue
        w = ipc_max[j][v]
        cti = float(np.sum(coseno[j][v] * w) / np.sum(w))
        top = int(np.bincount(estrella[j][v]).argmax())
        salida.append({
            "nflId": int(m["ids"][cob[j]]), "cti": cti, "ipcMax": float(w.mean()),
            "receptorPrioritario": int(m["ids"][rec[top]]),
        })
    return salida


# --------------------------------------------------------------------------------------
# Pipeline completo
# --------------------------------------------------------------------------------------

def procesar_todo(progreso=None) -> dict:
    t0 = time.time()
    ctx = cargar_contexto()
    archivos = sorted((DATA / "tracking").glob("tracking_*.csv"))
    filas: list[dict] = []
    equipo_de: dict[int, str] = {}
    for i, ruta in enumerate(archivos):
        tr = leer_partido(ruta, ctx)
        if not tr.empty:
            cob = tr[tr["rol"] == ROL_COBERTURA].drop_duplicates("nflId")
            equipo_de.update(dict(zip(cob["nflId"].astype(int), cob["team"])))
            for play_id, g in tr.groupby("playId", sort=False):
                m = matrices_jugada(g)
                if m is None:
                    continue
                r = ipc_jugada(m)
                if r is None:
                    continue
                for fila in cti_jugada(m, r):
                    fila["gameId"] = int(g["gameId"].iloc[0])
                    fila["playId"] = int(play_id)
                    filas.append(fila)
        if progreso:
            progreso((i + 1) / len(archivos))

    df = pd.DataFrame(filas)
    plays = ctx["plays"]
    _guardar_estado(df, ctx, equipo_de)
    resultado = construir_resumen(df, plays, ctx["players"], equipo_de)
    resultado["casos"] = construir_casos(df, plays, ctx)
    resultado["meta"] = {
        "segundos": round(time.time() - t0, 1),
        "partidos": len(archivos),
        "fuente": "NFL Big Data Bowl 2023 · temporada 2021, semanas 1-8",
    }
    return resultado


def construir_resumen(df: pd.DataFrame, plays: pd.DataFrame, players: pd.DataFrame,
                      equipo_de: dict[int, str]) -> dict:
    # CTI de la jugada: promedio de los defensores ponderado por la amenaza que enfrentaron
    df["peso"] = df["ipcMax"]
    por_jugada = (df.assign(p=df["cti"] * df["peso"]).groupby(["gameId", "playId"])
                  .agg(p=("p", "sum"), w=("peso", "sum")))
    por_jugada["ctiJugada"] = por_jugada["p"] / por_jugada["w"]
    j = por_jugada.reset_index().merge(plays, on=["gameId", "playId"])

    def grupo(mask: pd.Series) -> dict:
        g = j[mask]
        return {
            "jugadas": int(len(g)),
            "completos": round(float((g["passResult"] == "C").mean() * 100), 1) if len(g) else None,
            "yardas": round(float(g["playResult"].mean()), 2) if len(g) else None,
            "exito": round(float(g["exito"].mean() * 100), 1) if len(g) else None,
        }

    alto = grupo(j["ctiJugada"] > UMBRAL_KPI)
    bajo = grupo(j["ctiJugada"] < -UMBRAL_KPI)
    kpis = {
        "jugadas": int(len(j)),
        "evaluaciones": int(len(df)),
        "defensores": int(df["nflId"].nunique()),
        "umbral": UMBRAL_KPI,
        "ctiAlto": alto,
        "ctiBajo": bajo,
        "ventanaSegundos": VENTANA / 10,
    }

    # Leaderboard
    df["correcta"] = df["cti"] > UMBRAL_ELITE
    lb = df.groupby("nflId").agg(jugadas=("cti", "size"), cti=("cti", "mean"), correctas=("correcta", "mean"))
    lb = lb[lb["jugadas"] >= MIN_JUGADAS_LEADERBOARD].reset_index().merge(players, on="nflId", how="left")
    lb["equipo"] = lb["nflId"].map(equipo_de)

    def filas_lb(t: pd.DataFrame) -> list[dict]:
        return [{
            "nflId": int(r.nflId), "nombre": r.displayName, "posicion": r.officialPosition,
            "equipo": r.equipo, "jugadas": int(r.jugadas), "cti": round(float(r.cti), 3),
            "lecturasCorrectas": round(float(r.correctas * 100), 1),
        } for r in t.itertuples()]

    return {
        "kpis": kpis,
        "leaderboardTop": filas_lb(lb.nlargest(5, "cti")),
        "leaderboardBottom": filas_lb(lb.nsmallest(5, "cti")),
        "minJugadas": MIN_JUGADAS_LEADERBOARD,
        "distribucion": distribucion(df["cti"]),
    }


def distribucion(cti: pd.Series) -> list[dict]:
    bordes = np.linspace(-1, 1, 21)
    conteo, _ = np.histogram(cti.clip(-1, 1), bins=bordes)
    return [{"desde": round(float(bordes[i]), 1), "hasta": round(float(bordes[i + 1]), 1),
             "n": int(c)} for i, c in enumerate(conteo)]


# --------------------------------------------------------------------------------------
# Jugadas de muestra (frames completos para el visor)
# --------------------------------------------------------------------------------------

def construir_casos(df: pd.DataFrame, plays: pd.DataFrame, ctx: dict) -> list[dict]:
    d = df.merge(plays[["gameId", "playId", "passResult", "playResult"]], on=["gameId", "playId"])
    d = d[d["ipcMax"] >= 0.55]  # que el defensor realmente tuviera una amenaza clara
    elite = d[d["passResult"].isin(["I", "IN"])].sort_values("cti", ascending=False)
    senuelo = d[(d["passResult"] == "C") & (d["playResult"] >= 12)].sort_values("cti")

    elegidos: list[tuple[str, pd.Series]] = []
    for tipo, tabla in (("elite", elite), ("senuelo", senuelo)):
        vistos, defensores = set(), set()
        for _, fila in tabla.iterrows():
            clave = (fila["gameId"], fila["playId"])
            if clave in vistos or fila["nflId"] in defensores:
                continue
            vistos.add(clave)
            defensores.add(fila["nflId"])
            elegidos.append((tipo, fila))
            if len(vistos) >= N_CASOS_POR_LADO:
                break

    casos = []
    jugadores = ctx["players"].set_index("nflId")
    for game_id in sorted({int(f["gameId"]) for _, f in elegidos}):
        tr = leer_partido(DATA / "tracking" / f"tracking_{game_id}.csv", ctx)
        bal = pd.read_csv(DATA / "tracking" / f"tracking_{game_id}.csv",
                          usecols=["playId", "frameId", "team", "playDirection", "x", "y"])
        bal = bal[bal["team"] == "football"]
        for tipo, fila in elegidos:
            if int(fila["gameId"]) != game_id:
                continue
            g = tr[tr["playId"] == fila["playId"]]
            caso = caso_jugada(g, bal[bal["playId"] == fila["playId"]], fila, tipo, plays, jugadores, ctx["games"])
            if caso:
                casos.append(caso)
    orden = {"elite": 0, "senuelo": 1}
    casos.sort(key=lambda c: (orden[c["tipo"]], -abs(c["cti"])))
    return casos


def caso_jugada(g: pd.DataFrame, bal: pd.DataFrame, fila: pd.Series, tipo: str,
                plays: pd.DataFrame, jugadores: pd.DataFrame, games: pd.DataFrame) -> dict | None:
    m = matrices_jugada(g)
    if m is None:
        return None
    r = ipc_jugada(m)
    if r is None:
        return None
    defensor = int(fila["nflId"])
    j = int(np.flatnonzero(m["ids"][r["cob"]] == defensor)[0])
    ipc = r["ipc"][:, j, :]                       # (nR, F)
    zona = r["zona"][:, j, :]
    dist = r["dist_rc"][:, j, :]
    F = ipc.shape[1]

    # Los 3 receptores más cercanos al defensor en promedio (fijos para la gráfica)
    cercanos = np.argsort(np.nanmean(np.where(np.isinf(dist), np.nan, dist), axis=1))[:3]

    def nombre(nid: int) -> str:
        return str(jugadores.loc[nid, "displayName"]) if nid in jugadores.index else str(nid)

    def pos(nid: int) -> str:
        return str(jugadores.loc[nid, "officialPosition"]) if nid in jugadores.index else ""

    roles = m["roles"]
    lado = np.where((roles == ROL_COBERTURA) | (roles == ROL_DEFENSA), "def", "off")
    camiseta = (g.drop_duplicates("nflId").set_index("nflId")["jerseyNumber"])
    lista_jug = [{
        "id": int(nid), "nombre": nombre(int(nid)), "pos": pos(int(nid)),
        "numero": int(camiseta.get(nid, 0)) if pd.notna(camiseta.get(nid, np.nan)) else None,
        "lado": str(lado[k]), "rol": int(roles[k]),
    } for k, nid in enumerate(m["ids"])]

    # Balón normalizado
    izq = g["playDirection"].iloc[0] == "left"
    bal = bal.set_index("frameId")
    eventos = (g.loc[g["event"].notna() & (g["event"] != "None"), ["frameId", "event"]]
               .drop_duplicates("frameId").set_index("frameId")["event"].to_dict())

    c_def = r["cob"][j]
    frames = []
    for f in range(F):
        fid = int(m["frames"][f])
        s_def, dir_def = m["S"][c_def, f], m["DIR"][c_def, f]
        xy = [[round(float(m["X"][k, f]), 2), round(float(m["Y"][k, f]), 2)]
              if not np.isnan(m["X"][k, f]) else None for k in range(len(m["ids"]))]
        b = None
        if fid in bal.index:
            bx, by = float(bal.loc[fid, "x"]), float(bal.loc[fid, "y"])
            b = [round(120 - bx if izq else bx, 2), round(53.3 - by if izq else by, 2)]
        frames.append({
            "frameId": fid,
            "t": round(f / 10, 1),
            "evento": eventos.get(fid),
            "xy": xy,
            "balon": b,
            "oQB": None if np.isnan(m["O"][r["qb"], f]) else round(float(m["O"][r["qb"], f]), 1),
            # Velocidad del defensor evaluado: [yd/s, dirección en grados NGS]
            "velDef": None if np.isnan(s_def) or np.isnan(dir_def) else [round(float(s_def), 2), round(float(dir_def), 1)],
            "objetivos": [{
                "id": int(m["ids"][r["rec"][i]]),
                "ipc": round(float(ipc[i, f]), 3),
                "estatus": estatus(float(ipc[i, f])),
                "enZona": bool(zona[i, f]),
                "orfandad": round(float(r["orf"][i, j, f]), 2),
                "mirada": round(float(r["mirada"][i, f]), 2),
                "primerDown": round(float(r["z"][i, f]), 2),
            } for i in cercanos],
        })

    # Hacia quién se movió realmente el defensor en la ventana (máximo coseno medio)
    t = np.arange(F - VENTANA, F)
    c = r["cob"][j]
    sx, sy = unitario_ngs(m["DIR"][c, t])
    hx = m["X"][r["rec"]][:, t] - m["X"][c, t]
    hy = m["Y"][r["rec"]][:, t] - m["Y"][c, t]
    nh = np.maximum(np.sqrt(hx * hx + hy * hy), 1e-3)
    cos_medio = np.nanmean((sx * hx + sy * hy) / nh, axis=1)
    hacia = int(m["ids"][r["rec"][int(np.nanargmax(cos_medio))]])

    p = plays[(plays["gameId"] == fila["gameId"]) & (plays["playId"] == fila["playId"])].iloc[0]
    juego = games[games["gameId"] == fila["gameId"]].iloc[0]
    ataque_local = p["possessionTeam"] == juego["homeTeamAbbr"]
    local, visita = int(p["preSnapHomeScore"]), int(p["preSnapVisitorScore"])
    return {
        "id": f"{int(fila['gameId'])}-{int(fila['playId'])}-{defensor}",
        "tipo": tipo,
        "gameId": int(fila["gameId"]),
        "playId": int(fila["playId"]),
        "semana": int(juego["week"]),
        "descripcion": str(p["playDescription"]),
        "ataque": str(p["possessionTeam"]),
        "defensa": str(p["defensiveTeam"]),
        "marcadorAtaque": local if ataque_local else visita,
        "marcadorDefensa": visita if ataque_local else local,
        "reloj": str(p["gameClock"]),
        "cuarto": int(p["quarter"]),
        "down": int(p["down"]),
        "yardsToGo": int(p["yardsToGo"]),
        "resultado": str(p["passResult"]),
        "yardas": int(p["playResult"]),
        "cobertura": None if pd.isna(p["pff_passCoverage"]) else str(p["pff_passCoverage"]),
        "los": round(m["los"], 2),
        "primerDown": round(m["primerDown"], 2),
        "cti": round(float(fila["cti"]), 3),
        "veredicto": veredicto(float(fila["cti"])),
        "defensor": {"id": defensor, "nombre": nombre(defensor), "pos": pos(defensor)},
        "receptorPrioritario": {"id": int(fila["receptorPrioritario"]), "nombre": nombre(int(fila["receptorPrioritario"]))},
        "seMovioHacia": {"id": hacia, "nombre": nombre(hacia)},
        "inicioVentana": max(0, F - VENTANA),
        "jugadores": lista_jug,
        "frames": frames,
    }



# --------------------------------------------------------------------------------------
# Explorar cualquier jugada (bajo demanda)
# --------------------------------------------------------------------------------------

_ESTADO: dict = {}


def tipo_de(cti: float) -> str:
    if cti > UMBRAL_ELITE:
        return "elite"
    if cti < UMBRAL_SENUELO:
        return "senuelo"
    return "neutral"


def _guardar_estado(df: pd.DataFrame, ctx: dict, equipo_de: dict[int, str]) -> None:
    """Tabla de evaluaciones defensor-jugada enriquecida, para el buscador."""
    p = ctx["plays"][["gameId", "playId", "possessionTeam", "defensiveTeam", "quarter", "down",
                      "yardsToGo", "passResult", "playResult", "pff_passCoverage"]]
    t = (df.merge(p, on=["gameId", "playId"])
           .merge(ctx["games"][["gameId", "week"]], on="gameId")
           .merge(ctx["players"].rename(columns={"displayName": "defensor", "officialPosition": "pos"}),
                  on="nflId", how="left"))
    t["tipo"] = [tipo_de(c) for c in t["cti"]]
    t["busqueda"] = t["defensor"].fillna("").str.lower()
    _ESTADO.clear()
    _ESTADO.update({"tabla": t, "ctx": ctx})
    caso_por_id.cache_clear()


def buscar_jugadas(q: str = "", equipo: str = "", tipo: str = "", resultado: str = "",
                   limite: int = MAX_RESULTADOS) -> dict:
    """Resumen de jugadas que cumplen los filtros, ordenadas por |CTI| (las más claras primero)."""
    t = _ESTADO.get("tabla")
    if t is None:
        return {"total": 0, "jugadas": []}
    m = pd.Series(True, index=t.index)
    if q.strip():
        m &= t["busqueda"].str.contains(q.strip().lower(), regex=False)
    if equipo:
        m &= (t["defensiveTeam"] == equipo.upper()) | (t["possessionTeam"] == equipo.upper())
    if tipo in ("elite", "senuelo", "neutral"):
        m &= t["tipo"] == tipo
    if resultado in ("C", "I", "IN"):
        m &= t["passResult"] == resultado
    r = t[m]
    r = r.reindex(r["cti"].abs().sort_values(ascending=False).index).head(max(1, min(limite, MAX_RESULTADOS)))
    return {
        "total": int(m.sum()),
        "jugadas": [{
            "id": f"{int(f.gameId)}-{int(f.playId)}-{int(f.nflId)}",
            "gameId": int(f.gameId), "playId": int(f.playId), "nflId": int(f.nflId),
            "defensor": f.defensor, "pos": f.pos, "ataque": f.possessionTeam, "defensa": f.defensiveTeam,
            "semana": int(f.week), "cuarto": int(f.quarter), "down": int(f.down), "yardsToGo": int(f.yardsToGo),
            "resultado": f.passResult, "yardas": int(f.playResult), "cti": round(float(f.cti), 3), "tipo": f.tipo,
        } for f in r.itertuples()],
    }


_candado_casos = threading.Lock()


@lru_cache(maxsize=64)
def caso_por_id(game_id: int, play_id: int, nfl_id: int) -> dict | None:
    """Frames completos de una jugada para el visor, calculados al momento (~0.3 s)."""
    t = _ESTADO.get("tabla")
    if t is None:
        return None
    sel = t[(t["gameId"] == game_id) & (t["playId"] == play_id) & (t["nflId"] == nfl_id)]
    if sel.empty:
        return None
    fila = sel.iloc[0]
    ctx = _ESTADO["ctx"]
    ruta = DATA / "tracking" / f"tracking_{game_id}.csv"
    with _candado_casos:
        tr = leer_partido(ruta, ctx)
        bal = pd.read_csv(ruta, usecols=["playId", "frameId", "team", "playDirection", "x", "y"])
    bal = bal[(bal["team"] == "football") & (bal["playId"] == play_id)]
    g = tr[tr["playId"] == play_id]
    return caso_jugada(g, bal, fila, tipo_de(float(fila["cti"])), ctx["plays"],
                       ctx["players"].set_index("nflId"), ctx["games"])


if __name__ == "__main__":
    def mostrar(p: float) -> None:
        print(f"\r  procesando partidos... {p * 100:5.1f}%", end="", flush=True)

    res = procesar_todo(mostrar)
    print()
    k = res["kpis"]
    print(f"Listo en {res['meta']['segundos']} s · {k['jugadas']} jugadas · {k['evaluaciones']} evaluaciones · {k['defensores']} defensores")
    print("CTI alto:", k["ctiAlto"])
    print("CTI bajo:", k["ctiBajo"])
    print("Top:", [(f["nombre"], f["cti"]) for f in res["leaderboardTop"]])
    print("Bottom:", [(f["nombre"], f["cti"]) for f in res["leaderboardBottom"]])
    for c in res["casos"]:
        print(f"  {c['id']} {c['tipo']:8s} CTI={c['cti']:+.2f} {c['defensor']['nombre']} · {c['resultado']} {c['yardas']} yds · {len(c['frames'])} frames")
    if not math.isfinite(sum(f["cti"] for f in res["leaderboardTop"])):
        raise SystemExit("CTI no finito")
