import { useEffect, useRef, useState } from 'react'
import type { Estado, Partido } from '../types'

const COLOR_ESTADO: Record<Estado, string> = { 'EN VIVO': '#f87171', FINAL: '#94a3b8', PRÓXIMO: '#93c5fd' }
const PUNTO_ESTADO: Record<Estado, string> = { 'EN VIVO': '#dc2626', FINAL: '#94a3b8', PRÓXIMO: '#2563eb' }

interface Props {
  partidos: Partido[]
  actual: Partido
  onElegir: (id: string) => void
}

export default function Encabezado({ partidos, actual, onElegir }: Props) {
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

  const marcador = (v: number | null) => (v === null ? '–' : v)

  return (
    <header className="relative z-20 -mx-6 grid grid-cols-1 items-center gap-4 bg-marino px-6 py-3.5 text-white md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex items-center justify-center gap-3 md:justify-start">
        <img src="img/logo-enes.png" alt="Logo ENES Juriquilla" className="h-14 w-10 object-contain" />
      </div>

      <div ref={caja} className="relative flex justify-center">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-label="Marcador. Elegir partido"
          onClick={() => setAbierto(!abierto)}
          className="btn-lift flex items-center gap-3 rounded-2xl border-[1.5px] py-1.5 pl-5 pr-3.5 font-display font-bold text-white sm:gap-[18px]"
          style={{
            borderColor: abierto ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
            background: abierto ? 'rgba(255,255,255,0.08)' : 'transparent',
          }}
        >
          <span className="text-xl text-enes-claro">ENES</span>
          <span className="text-[44px] leading-none text-enes-claro">{marcador(actual.local)}</span>
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-sm tracking-[0.06em]" style={{ color: COLOR_ESTADO[actual.estado] }}>
              {actual.estado}
            </span>
            <span className="text-base text-neutral-300">{actual.reloj}</span>
          </span>
          <span className="text-[44px] leading-none text-visita-claro">{marcador(actual.visita)}</span>
          <span className="text-xl text-visita-claro">{actual.rivalCorto}</span>
          <span aria-hidden="true" className="w-px self-stretch bg-white/20" />
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {abierto && (
          <div
            role="listbox"
            aria-label="Partidos"
            className="card-in absolute left-1/2 top-[calc(100%+8px)] z-30 -ml-[130px] flex w-[260px] flex-col gap-0.5 rounded-[14px] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.28)]"
          >
            {partidos.map((p) => {
              const sel = p.id === actual.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={() => {
                    onElegir(p.id)
                    setAbierto(false)
                  }}
                  className={`flex min-h-[44px] items-center justify-between gap-2 rounded-[10px] px-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100 ${sel ? 'bg-blue-50' : ''}`}
                >
                  J{p.jornada} · {p.rival}
                  <span className="h-2 w-2 rounded-full" style={{ background: PUNTO_ESTADO[p.estado] }} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <nav aria-label="Aliados" className="flex flex-wrap items-center justify-center gap-[18px] md:justify-end">
        <img src="img/unam.png" alt="UNAM" className="h-[52px] w-auto object-contain" />
        <span aria-hidden="true" className="h-9 w-px bg-white/30" />
        <img src="img/aws.png" alt="AWS" className="h-[34px] w-auto object-contain" />
        <span aria-hidden="true" className="h-9 w-px bg-white/30" />
        <img src="img/nfl.png" alt="NFL" className="h-[54px] w-auto object-contain" />
      </nav>
    </header>
  )
}
