import { useEffect, useRef, useState } from 'react'
import type { Caso, ResumenJugada } from '../types'
import MenuJugadas from './MenuJugadas'

const COLOR_VEREDICTO: Record<Caso['tipo'], string> = { elite: '#4ade80', senuelo: '#f87171', neutral: '#fbbf24' }

interface Props {
  casos: Caso[]
  actual: Caso
  onElegir: (id: string) => void
  onElegirJugada: (r: ResumenJugada) => void
  cargando: boolean
  onTutorial: () => void
}

export default function Encabezado({ casos, actual, onElegir, onElegirJugada, cargando, onTutorial }: Props) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Cierra el menú al hacer clic fuera o al presionar Escape.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  return (
    <header className="relative z-20 -mx-6 grid grid-cols-1 items-center gap-4 bg-marino px-6 py-3.5 text-white md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex items-center justify-center gap-3 md:justify-start">
        <img src="img/logo-enes.png" alt="Logo ENES Juriquilla" className="h-14 w-10 object-contain" />
        <span className="hidden font-display text-xl font-bold tracking-[0.03em] lg:inline">TouchWay</span>
        <button
          type="button"
          onClick={onTutorial}
          data-tour="tutorial"
          className="btn-lift ml-1 flex h-10 items-center gap-1.5 rounded-full border border-white/40 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01" />
          </svg>
          Tutorial
        </button>
      </div>

      <div ref={caja} className="relative flex flex-col items-center gap-1">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label="Marcador. Elegir jugada"
          data-tour="marcador"
          onClick={() => setAbierto(!abierto)}
          className="btn-lift flex items-center gap-3 rounded-2xl border-[1.5px] py-1.5 pl-5 pr-3.5 font-display font-bold text-white sm:gap-[18px]"
          style={{
            borderColor: abierto ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            background: abierto ? 'rgba(255,255,255,0.08)' : 'transparent',
          }}
        >
          <span className="text-xl text-enes-claro">{actual.ataque}</span>
          <span className="text-[44px] leading-none text-enes-claro">{actual.marcadorAtaque}</span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-sm uppercase tracking-[0.06em]" style={{ color: COLOR_VEREDICTO[actual.tipo] }}>
              {actual.veredicto}
            </span>
            <span className="text-base text-neutral-300">
              Q{actual.cuarto} · {actual.reloj} · {actual.down}ª y {actual.yardsToGo}
            </span>
          </span>
          <span className="text-[44px] leading-none text-visita-claro">{actual.marcadorDefensa}</span>
          <span className="text-xl text-visita-claro">{actual.defensa}</span>
          <span aria-hidden="true" className="w-px self-stretch bg-white/20" />
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <span className="text-[11px] font-medium tracking-[0.04em] text-[#b6c2d6]" aria-live="polite">
          {cargando ? 'Cargando jugada…' : 'Toca el marcador para cambiar o buscar jugadas'}
        </span>

        {abierto && (
          <div
            role="listbox"
            aria-label="Jugadas"
            className="card-in absolute left-1/2 top-[calc(100%+8px)] z-30 flex max-h-[72vh] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 flex-col overflow-hidden rounded-[14px] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
          >
            <MenuJugadas
              casos={casos}
              actualId={actual.id}
              onElegirDestacada={(id) => { onElegir(id); setAbierto(false) }}
              onElegirJugada={(r) => { onElegirJugada(r); setAbierto(false) }}
            />
          </div>
        )}
      </div>

      <nav aria-label="Aliados" className="flex flex-wrap items-center justify-center gap-[18px] md:justify-end">
        <img src="img/unam-dorado.png" alt="UNAM" className="h-[60px] w-auto object-contain" />
        <span aria-hidden="true" className="h-9 w-px bg-white/30" />
        <img src="img/aws.png" alt="AWS" className="h-[34px] w-auto object-contain" />
        <span aria-hidden="true" className="h-9 w-px bg-white/30" />
        <img src="img/nfl-color.png" alt="NFL" className="h-[54px] w-auto object-contain" />
      </nav>
    </header>
  )
}
