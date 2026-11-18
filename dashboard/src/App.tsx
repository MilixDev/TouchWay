import { useEffect, useMemo, useRef, useState } from 'react'
import AnaliticasGenerales from './components/AnaliticasGenerales'
import Cancha from './components/Cancha'
import Encabezado from './components/Encabezado'
import MiniCancha from './components/MiniCancha'
import { PanelAmenazas, PanelDefensor } from './components/Paneles'
import Pie from './components/Pie'
import SelectorJugador from './components/SelectorJugador'
import Tutorial from './components/Tutorial'
import { COLOR, COLOR_ESTATUS, COLOR_EVALUADO, type DatosCoverage, type Lado, type Caso, type RespuestaCoverage, type ResumenJugada, type VistaJugadores } from './types'

const PASOS_ZOOM = [1, 1.25, 1.5, 2, 2.5, 3]
const VELOCIDADES = [0.5, 1, 2]

function Lupa({ mas }: { mas?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d={mas ? 'M20 20l-4-4M8 11h6M11 8v6' : 'M20 20l-4-4M8 11h6'} />
    </svg>
  )
}

/** Botón vertical a los lados de la cancha que muestra u oculta un panel. */
function BotonPanel({ lado, abierto, texto, onClick, tour }: { lado: Lado; abierto: boolean; texto: string; onClick: () => void; tour?: string }) {
  const c = COLOR[lado].fuerte
  const izq = lado === 'off'
  return (
    <button
      type="button"
      aria-expanded={abierto}
      onClick={onClick}
      data-tour={tour}
      className="btn-lift flex min-h-[260px] flex-[0_0_52px] flex-col items-center justify-center gap-3 rounded-[14px] border-2 py-3.5"
      style={{ borderColor: c, background: abierto ? c : '#ffffff', color: abierto ? '#ffffff' : c }}
    >
      <svg
        width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ transform: abierto ? 'none' : 'rotate(180deg)', transition: 'transform 0.35s ease' }}
      >
        <path d={izq ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
      </svg>
      <span
        className="whitespace-nowrap font-display text-[17px] font-bold uppercase tracking-[0.06em]"
        style={{ writingMode: 'vertical-rl', transform: izq ? 'rotate(180deg)' : undefined }}
      >
        {abierto ? 'Ocultar' : 'Ver'} {texto}
      </span>
    </button>
  )
}

/** Pide api/coverage y vuelve a preguntar mientras el backend sigue calculando. */
function useCoverage() {
  const [resp, setResp] = useState<RespuestaCoverage | null>(null)
  const [falla, setFalla] = useState('')
  useEffect(() => {
    let vivo = true
    let reloj: number | undefined
    const pedir = () => {
      fetch('api/coverage')
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json() as Promise<RespuestaCoverage>
        })
        .then((d) => {
          if (!vivo) return
          setFalla('')
          setResp(d)
          if (d.estado === 'calculando') reloj = window.setTimeout(pedir, 1500)
        })
        .catch((e: Error) => {
          if (!vivo) return
          setFalla(e.message)
          reloj = window.setTimeout(pedir, 3000)
        })
    }
    pedir()
    return () => {
      vivo = false
      window.clearTimeout(reloj)
    }
  }, [])
  return { resp, falla }
}

export default function App() {
  const { resp, falla } = useCoverage()

  if (!resp || resp.estado !== 'listo') {
    const progreso = resp?.estado === 'calculando' ? resp.progreso : 0
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-marino px-4 text-center text-white">
        <img src="img/logo-enes.png" alt="Logo ENES Juriquilla" className="h-20 w-auto" />
        {resp?.estado === 'error' ? (
          <>
            <p className="m-0 font-display text-2xl font-bold">No se pudieron calcular las analíticas</p>
            <p className="m-0 max-w-lg text-sm text-[#b6c2d6]">{resp.mensaje}</p>
          </>
        ) : falla ? (
          <>
            <p className="m-0 font-display text-2xl font-bold">No se pudo contactar la API</p>
            <p className="m-0 text-sm text-[#b6c2d6]">Respondió: {falla}. Reintentando…</p>
          </>
        ) : (
          <>
            <p className="m-0 font-display text-2xl font-bold tracking-[0.04em]">Calculando IPC y CTI frame por frame…</p>
            <div className="h-2 w-72 max-w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-enes-claro transition-[width] duration-500" style={{ width: `${progreso * 100}%` }} />
            </div>
            <span className="font-display text-xl font-bold text-enes-claro">{Math.round(progreso * 100)}%</span>
          </>
        )}
      </div>
    )
  }
  return <Pagina datos={resp} />
}

function Pagina({ datos }: { datos: DatosCoverage }) {
  const casos = datos.casos
  const [casoId, setCasoId] = useState(casos[0]?.id ?? '')
  // Jugada traída del buscador (no está entre las destacadas)
  const [extra, setExtra] = useState<Caso | null>(null)
  const [cargandoJugada, setCargandoJugada] = useState(false)
  const [avisoJugada, setAvisoJugada] = useState('')
  const [frame, setFrame] = useState(0)
  const [jugando, setJugando] = useState(true)
  const [vel, setVel] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [verAmenazas, setVerAmenazas] = useState(false)
  const [verDefensor, setVerDefensor] = useState(true)
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [vista, setVista] = useState<VistaJugadores>('puntos')
  const [pausaEnPase, setPausaEnPase] = useState(true)
  const [tutorial, setTutorial] = useState(false)

  // Al abrir la página, el tutorial arranca solo (con una pausa breve para que todo se acomode)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setJugando(false)
      setTutorial(true)
    }, 700)
    return () => window.clearTimeout(t)
  }, [])

  const caso = useMemo(() => extra ?? casos.find((c) => c.id === casoId) ?? casos[0], [extra, casos, casoId])
  const total = caso?.frames.length ?? 0

  /** Play/pausa; si ya llegó al pase, vuelve a empezar desde el snap. */
  const alternarJuego = () => {
    if (!jugando && frame >= total - 1) setFrame(0)
    setJugando(!jugando)
  }

  // Atajos: espacio = play/pausa, flechas = frame anterior/siguiente
  const atajo = useRef(alternarJuego)
  atajo.current = alternarJuego
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, select, textarea, [contenteditable="true"]')) return
      if (e.key === ' ' && !t.closest('button, [role="button"]')) {
        e.preventDefault()
        atajo.current()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        setJugando(false)
        setFrame((f) => Math.min(Math.max(f + (e.key === 'ArrowRight' ? 1 : -1), 0), total - 1))
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [total])

  // Miniatura: aparece cuando la cancha principal quedó arriba, fuera de la pantalla
  const campo = useRef<HTMLDivElement>(null)
  const [campoArriba, setCampoArriba] = useState(false)
  const [miniCerrada, setMiniCerrada] = useState(false)
  useEffect(() => {
    let raf = 0
    const revisar = () => {
      raf = 0
      const el = campo.current
      if (!el) return
      // La cancha "quedó arriba" cuando ya casi no se ve (menos de 120 px en pantalla)
      const arriba = el.getBoundingClientRect().bottom < 120
      setCampoArriba(arriba)
      if (!arriba) setMiniCerrada(false)
    }
    const alMover = () => {
      if (!raf) raf = requestAnimationFrame(revisar)
    }
    window.addEventListener('scroll', alMover, { passive: true })
    window.addEventListener('resize', alMover)
    revisar()
    return () => {
      window.removeEventListener('scroll', alMover)
      window.removeEventListener('resize', alMover)
      cancelAnimationFrame(raf)
    }
  }, [])
  const volverACancha = () => campo.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // Reproductor a 10 Hz
  // El último frame es el lanzamiento: ahí se pausa (si está activado) o vuelve a empezar
  useEffect(() => {
    if (!jugando || !total) return
    const id = window.setInterval(() => {
      setFrame((f) => {
        if (f + 1 < total) return f + 1
        if (pausaEnPase) {
          queueMicrotask(() => setJugando(false))
          return f
        }
        return 0
      })
    }, 100 / vel)
    return () => window.clearInterval(id)
  }, [jugando, vel, total, pausaEnPase])

  if (!caso) return <p className="p-6">No hay jugadas de muestra.</p>

  const reiniciarVista = () => {
    setFrame(0)
    setSeleccion(null)
    setJugando(true)
  }
  const elegirCaso = (id: string) => {
    setExtra(null)
    setCasoId(id)
    setAvisoJugada('')
    reiniciarVista()
  }
  // Cualquier jugada del buscador: se piden sus frames al backend
  const elegirJugada = (r: ResumenJugada) => {
    if (casos.some((c) => c.id === r.id)) return elegirCaso(r.id)
    setCargandoJugada(true)
    setAvisoJugada('')
    fetch(`api/jugada/${r.gameId}/${r.playId}/${r.nflId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Caso>
      })
      .then((c) => {
        setExtra(c)
        reiniciarVista()
      })
      .catch((e: Error) => setAvisoJugada(`No se pudo cargar la jugada (${e.message}).`))
      .finally(() => setCargandoJugada(false))
  }

  const fi = Math.min(frame, total - 1)
  const f = caso.frames[fi]
  let evento = 'ball_snap'
  for (let i = 0; i <= fi; i++) if (caso.frames[i].evento) evento = caso.frames[i].evento!
  const enVentana = fi >= caso.inicioVentana
  const iz = PASOS_ZOOM.indexOf(zoom)

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-white font-sans text-slate-900"
      // Patrón tenue con los escudos de NFL, UNAM y AWS en las áreas blancas (ruta relativa)
      style={{ backgroundImage: 'url(img/patron-logos.png)', backgroundSize: '280px 200px', backgroundRepeat: 'repeat' }}
    >
      <img
        src="img/fondo-enes.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[820px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 opacity-[0.45] mix-blend-multiply"
      />
      <div className="relative z-[1] mx-auto box-border flex max-w-[1440px] flex-col gap-5 px-6 pb-10">
        <Encabezado casos={casos} actual={caso} onElegir={elegirCaso} onElegirJugada={elegirJugada} cargando={cargandoJugada} onTutorial={() => { setJugando(false); setTutorial(true) }} />
        {avisoJugada && (
          <p role="alert" className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{avisoJugada}</p>
        )}

        {/* Hallazgo principal */}
        <section aria-label="Hallazgo principal" data-tour="hallazgo" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white/85 px-5 py-4">
          <p className="m-0 min-w-[260px] flex-[1_1_420px] text-[15px] leading-snug text-slate-700">
            <span className="font-display text-lg font-bold uppercase tracking-[0.04em] text-slate-900">Hallazgo · </span>
            Cuando el defensor corre hacia la amenaza real en el último segundo antes del pase, la ofensiva completa{' '}
            <strong className="text-[#15803d]">{datos.kpis.ctiAlto.completos?.toFixed(1)}%</strong> de sus pases; cuando muerde el señuelo,{' '}
            <strong className="text-[#b91c1c]">{datos.kpis.ctiBajo.completos?.toFixed(1)}%</strong>.
          </p>
          <div className="flex items-baseline gap-3 font-display font-bold">
            <span className="flex flex-col items-center">
              <span className="text-[40px] leading-none text-[#15803d]">{datos.kpis.ctiAlto.completos?.toFixed(1)}%</span>
              <span className="font-sans text-[11px] font-medium text-slate-500">lee bien</span>
            </span>
            <span className="text-lg text-slate-400">vs</span>
            <span className="flex flex-col items-center">
              <span className="text-[40px] leading-none text-[#b91c1c]">{datos.kpis.ctiBajo.completos?.toFixed(1)}%</span>
              <span className="font-sans text-[11px] font-medium text-slate-500">muerde el señuelo</span>
            </span>
          </div>
          <span className="w-full text-[11px] text-slate-500">
            Pases completos permitidos · {datos.kpis.jugadas.toLocaleString('es-MX')} jugadas de pase de la temporada 2021 (semanas 1-8)
          </span>
        </section>

        <div className="flex flex-wrap items-stretch gap-5">
          {verAmenazas && <PanelAmenazas caso={caso} frame={f} />}

          <main className="flex min-w-0 flex-[5_1_760px] flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 flex items-center gap-2 font-display text-[22px] uppercase tracking-[0.04em]">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M12 5v14M5 5v14M19 5v14" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Radar de triaje en cancha
              </h2>
              <div className="flex flex-wrap items-center gap-2" data-tour="vista">
              <div role="group" aria-label="Vista de jugadores" className="flex rounded-full border border-slate-300 bg-white p-0.5">
                {(['puntos', 'sprites'] as const).map((v) => (
                  <button
                    key={v} type="button" onClick={() => setVista(v)} aria-pressed={vista === v}
                    className={`h-10 rounded-full px-3.5 text-sm font-semibold capitalize ${vista === v ? 'bg-marino text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Zoom del mapa" className="flex items-center rounded-full border border-slate-300 bg-white p-0.5">
                <button type="button" aria-label="Disminuir mapa" disabled={iz <= 0} onClick={() => setZoom(PASOS_ZOOM[Math.max(iz - 1, 0)])} className="flex h-10 w-11 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 disabled:opacity-40">
                  <Lupa />
                </button>
                <span className="min-w-[52px] text-center font-display text-lg font-bold text-slate-900">{Math.round(zoom * 100)}%</span>
                <button type="button" aria-label="Agrandar mapa" disabled={iz >= PASOS_ZOOM.length - 1} onClick={() => setZoom(PASOS_ZOOM[Math.min(iz + 1, PASOS_ZOOM.length - 1)])} className="flex h-10 w-11 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 disabled:opacity-40">
                  <Lupa mas />
                </button>
              </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
              {(['PRIORIDAD', 'ALERTA', 'SEÑUELO'] as const).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="w-5 rounded-full" style={{ background: COLOR_ESTATUS[s], height: s === 'PRIORIDAD' ? 4 : s === 'ALERTA' ? 3 : 2 }} />
                  {s}
                </span>
              ))}
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_EVALUADO }} />Defensor evaluado</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-[#3b82f6]" />Línea de golpeo</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded-full bg-[#eab308]" />1.º y 10</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-slate-300" />Visión del QB</span>
              <span className="flex items-center gap-1.5">
                <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><line x1="1" y1="5" x2="15" y2="5" stroke="#0f172a" strokeWidth="3" /><path d="M14 1l7 4-7 4z" fill="#0f172a" /></svg>
                Velocidad del defensor (1 s)
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true"><path d="M1 8 Q8 1 21 5" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" /></svg>
                Ruta recorrida
              </span>
            </div>

            <div ref={campo} className="flex items-stretch gap-2.5">
              <BotonPanel lado="off" abierto={verAmenazas} texto={`amenazas de ${caso.ataque}`} onClick={() => setVerAmenazas(!verAmenazas)} tour="amenazas" />
              <div className="max-h-[860px] min-w-0 flex-auto overflow-auto rounded-[14px]" data-tour="cancha">
                <Cancha caso={caso} frame={fi} seleccion={seleccion} onElegir={setSeleccion} zoom={zoom} vista={vista} />
              </div>
              <BotonPanel lado="def" abierto={verDefensor} texto={`defensor de ${caso.defensa}`} onClick={() => setVerDefensor(!verDefensor)} tour="defensor" />
            </div>

            {/* Reproductor */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2" data-tour="reproductor">
              <button
                type="button" onClick={alternarJuego} aria-label={jugando ? 'Pausar (espacio)' : 'Reproducir (espacio)'}
                className="btn-lift flex h-11 w-11 items-center justify-center rounded-full bg-marino text-white"
              >
                {jugando ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>
                )}
              </button>
              <div role="group" aria-label="Velocidad" className="flex rounded-full border border-slate-300 bg-white p-0.5">
                {VELOCIDADES.map((v) => (
                  <button
                    key={v} type="button" onClick={() => setVel(v)} aria-pressed={vel === v}
                    className={`h-9 min-w-[48px] rounded-full px-2 font-display text-base font-bold ${vel === v ? 'bg-marino text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {v}x
                  </button>
                ))}
              </div>
              <input
                type="range" min={0} max={total - 1} value={fi} aria-label="Frame"
                onChange={(e) => { setJugando(false); setFrame(Number(e.target.value)) }}
                className="min-w-[160px] flex-1 accent-[#1d4ed8]"
              />
              <span className="font-display text-lg font-bold tabular-nums text-slate-900">
                {f.t.toFixed(1)} s · {fi + 1}/{total}
              </span>
              <span
                className="rounded-full px-2.5 py-1 font-mono text-xs"
                style={{ background: enVentana ? '#fae8ff' : '#f1f5f9', color: enVentana ? '#a21caf' : '#334155' }}
              >
                {evento}{enVentana ? ' · ventana CTI' : ''}
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                <input type="checkbox" checked={pausaEnPase} onChange={(e) => setPausaEnPase(e.target.checked)} className="h-4 w-4 accent-[#1d4ed8]" />
                Pausar en el pase
              </label>
              <span className="hidden text-[11px] text-slate-500 lg:inline">Espacio: play/pausa · ← →: frame</span>
            </div>

            <SelectorJugador caso={caso} frame={f} seleccion={seleccion} onElegir={setSeleccion} />
          </main>

          {verDefensor && <PanelDefensor caso={caso} />}
        </div>

        <AnaliticasGenerales datos={datos} caso={caso} frame={fi} />
        <Pie fuente={datos.meta.fuente} />
      </div>

      {tutorial && <Tutorial onCerrar={() => setTutorial(false)} />}

      {campoArriba && !miniCerrada && !tutorial && (
        <MiniCancha
          caso={caso}
          frame={fi}
          evento={evento}
          jugando={jugando}
          onJugar={alternarJuego}
          vista={vista}
          onFrame={(n) => { setJugando(false); setFrame(n) }}
          seleccion={seleccion}
          onElegir={setSeleccion}
          onVolver={volverACancha}
          onCerrar={() => setMiniCerrada(true)}
        />
      )}
    </div>
  )
}
