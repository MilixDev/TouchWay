import { useEffect, useState } from 'react'
import AnaliticasGenerales from './components/AnaliticasGenerales'
import Cancha from './components/Cancha'
import Encabezado from './components/Encabezado'
import PanelEquipo from './components/PanelEquipo'
import Pie from './components/Pie'
import SelectorJugador from './components/SelectorJugador'
import { COLOR, type Lado, type Tablero } from './types'

const PASOS_ZOOM = [1, 1.25, 1.5, 2, 2.5, 3]

function Lupa({ mas }: { mas?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d={mas ? 'M20 20l-4-4M8 11h6M11 8v6' : 'M20 20l-4-4M8 11h6'} />
    </svg>
  )
}

/** Botón vertical a los lados de la cancha que muestra u oculta el panel de un equipo. */
function BotonPanel({ lado, abierto, nombre, onClick }: { lado: Lado; abierto: boolean; nombre: string; onClick: () => void }) {
  const c = COLOR[lado].fuerte
  const izq = lado === 'local'
  return (
    <button
      type="button"
      aria-expanded={abierto}
      onClick={onClick}
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
        {abierto ? 'Ocultar' : 'Ver'} analíticas de {nombre}
      </span>
    </button>
  )
}

export default function App() {
  const [datos, setDatos] = useState<Tablero | null>(null)
  const [error, setError] = useState('')
  const [partido, setPartido] = useState('')
  const [zoom, setZoom] = useState(1)
  const [verLocal, setVerLocal] = useState(false)
  const [verVisita, setVerVisita] = useState(false)
  const [seleccion, setSeleccion] = useState('')

  const cargar = () => {
    setError('')
    fetch('api/tablero')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<Tablero>
      })
      .then((d) => {
        setDatos(d)
        setPartido((p) => p || d.partidoActual)
      })
      .catch((e: Error) => setError(e.message))
  }
  useEffect(cargar, [])

  if (!datos) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-marino px-4 text-center text-white">
        <img src="img/logo-enes.png" alt="Logo ENES Juriquilla" className="h-20 w-auto" />
        {error ? (
          <>
            <p className="m-0 font-display text-2xl font-bold">No se pudieron cargar las analíticas</p>
            <p className="m-0 text-sm text-[#b6c2d6]">La API respondió: {error}. Revisa que el backend esté corriendo.</p>
            <button type="button" onClick={cargar} className="btn-lift h-11 rounded-full bg-white px-5 text-sm font-semibold text-marino">
              Reintentar
            </button>
          </>
        ) : (
          <p className="m-0 animate-pulse font-display text-xl tracking-[0.06em]">Cargando analíticas…</p>
        )}
      </div>
    )
  }

  const actual = datos.partidos.find((p) => p.id === partido) ?? datos.partidos[0]
  const iz = PASOS_ZOOM.indexOf(zoom)

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans text-slate-900">
      <img
        src="img/fondo-enes.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[820px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 opacity-[0.45] mix-blend-multiply"
      />
      <div className="relative z-[1] mx-auto box-border flex max-w-[1440px] flex-col gap-5 px-6 pb-10">
        <Encabezado partidos={datos.partidos} actual={actual} onElegir={setPartido} />

        <div className="flex flex-wrap items-stretch gap-5">
          {verLocal && <PanelEquipo equipo={datos.equipos.local} lado="local" />}

          <main className="flex min-w-0 flex-[5_1_760px] flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 flex items-center gap-2 font-display text-[22px] uppercase tracking-[0.04em]">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M12 5v14M5 5v14M19 5v14" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Formación en cancha
              </h2>
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

            <div className="flex items-stretch gap-2.5">
              <BotonPanel lado="local" abierto={verLocal} nombre="ENES" onClick={() => setVerLocal(!verLocal)} />
              <div className="max-h-[860px] min-w-0 flex-auto overflow-auto rounded-[14px]">
                <Cancha jugadores={datos.jugadores} seleccion={seleccion} onElegir={setSeleccion} zoom={zoom} />
              </div>
              <BotonPanel lado="visita" abierto={verVisita} nombre={datos.equipos.visita.nombre} onClick={() => setVerVisita(!verVisita)} />
            </div>

            <SelectorJugador jugadores={datos.jugadores} equipos={datos.equipos} seleccion={seleccion} onElegir={setSeleccion} />
          </main>

          {verVisita && <PanelEquipo equipo={datos.equipos.visita} lado="visita" />}
        </div>

        <AnaliticasGenerales generales={datos.generales} equipos={datos.equipos} fuente={datos.fuente} />
        <Pie fuente={datos.fuente} />
      </div>
    </div>
  )
}
