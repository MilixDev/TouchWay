import { useState } from 'react'
import { colorCti, signo, type Caso, type VistaJugadores } from '../types'
import Cancha from './Cancha'

interface Props {
  caso: Caso
  frame: number
  evento: string
  jugando: boolean
  onJugar: () => void
  vista: VistaJugadores
  onFrame: (f: number) => void
  seleccion: number | null
  onElegir: (id: number | null) => void
  onVolver: () => void
  onCerrar: () => void
}

function Icono({ d, relleno = false }: { d: string; relleno?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      fill={relleno ? 'currentColor' : 'none'} stroke={relleno ? 'none' : 'currentColor'}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const BOTON = 'flex h-9 w-9 flex-none items-center justify-center rounded-full text-white hover:bg-white/15'

/**
 * Miniatura flotante de la cancha completa, fija arriba al centro. Aparece cuando la cancha
 * principal sale de la pantalla y comparte el mismo frame, así que la gráfica y los paneles
 * de abajo siguen sincronizados con lo que se ve aquí.
 */
export default function MiniCancha({ caso, frame, evento, jugando, onJugar, vista, onFrame, seleccion, onElegir, onVolver, onCerrar }: Props) {
  const [grande, setGrande] = useState(false)
  const total = caso.frames.length
  const t = caso.frames[frame]?.t ?? 0
  const pctVentana = (caso.inicioVentana / Math.max(total - 1, 1)) * 100

  return (
    <aside
      aria-label="Miniatura de la cancha"
      className={`mini-in fixed left-1/2 top-2 z-50 flex -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-white/20 bg-marino shadow-[0_18px_48px_rgba(15,23,42,0.45)] ${
        grande
          ? 'w-[min(calc(100vw-24px),1200px,calc(55vh*2.25))]'
          : 'w-[min(calc(100vw-24px),860px,calc(38vh*2.25))]'
      }`}
    >
      {/* Una sola barra con controles y datos, para no robar altura */}
      <div className="flex items-center gap-1.5 px-2 py-1 text-white">
        <button type="button" onClick={onJugar} aria-label={jugando ? 'Pausar' : 'Reproducir'} className={BOTON}>
          {jugando ? <Icono relleno d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <Icono relleno d="M7 5l12 7-12 7z" />}
        </button>
        <span className="font-display text-base font-bold text-enes-claro">{caso.ataque}</span>
        <span className="font-display text-sm text-white/60">vs</span>
        <span className="font-display text-base font-bold text-visita-claro">{caso.defensa}</span>
        <span className="ml-1 whitespace-nowrap rounded-full px-2 py-px font-display text-sm font-bold text-white" style={{ background: colorCti(caso.cti) }}>
          CTI {signo(caso.cti)}
        </span>
        <span className="ml-2 hidden truncate font-mono text-[11px] text-[#b6c2d6] sm:inline">
          {t.toFixed(1)} s · {frame + 1}/{total} · {evento}
        </span>
        <div className="ml-auto flex items-center">
          <button type="button" onClick={() => setGrande(!grande)} aria-label={grande ? 'Hacer más chica' : 'Hacer más grande'} className={`${BOTON} hidden sm:flex`}>
            {grande ? <Icono d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <Icono d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
          </button>
          <button type="button" onClick={onVolver} aria-label="Volver a la cancha" className={BOTON}>
            <Icono d="M12 19V5M5 12l7-7 7 7" />
          </button>
          <button type="button" onClick={onCerrar} aria-label="Cerrar miniatura" className={BOTON}>
            <Icono d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      </div>

      <button type="button" onClick={onVolver} className="block cursor-zoom-in bg-[#3f8f4a]" aria-label="Volver a la cancha completa" title="Volver a la cancha">
        <Cancha caso={caso} frame={frame} seleccion={seleccion} onElegir={onElegir} zoom={1} estatica completa vista={vista} />
      </button>

      {/* Barra de progreso: la franja rosa es el último segundo evaluado para el CTI */}
      <div className="relative h-2 bg-white/15">
        <div className="absolute inset-y-0 right-0 bg-[#e879f9]/40" style={{ left: `${pctVentana}%` }} />
        <div className="absolute inset-y-0 left-0 bg-enes-claro" style={{ width: `${(frame / Math.max(total - 1, 1)) * 100}%` }} />
        <input
          type="range" min={0} max={total - 1} value={frame} aria-label="Frame"
          onChange={(e) => onFrame(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </aside>
  )
}
