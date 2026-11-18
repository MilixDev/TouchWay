import { COLOR, type Equipo, type Jugador, type Lado } from '../types'
import FiguraJugador from './FiguraJugador'

interface Props {
  jugadores: Jugador[]
  equipos: Record<Lado, Equipo>
  seleccion: string
  onElegir: (id: string) => void
}

function Cerrar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export default function SelectorJugador({ jugadores, equipos, seleccion, onElegir }: Props) {
  const s = jugadores.find((p) => p.id === seleccion)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="m-0 flex items-center gap-2 font-display text-[22px] font-bold uppercase tracking-[0.04em] text-slate-900">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Seleccionar jugador
          </h3>
          <span className="text-[13px] text-slate-600">
            {s ? `#${s.numero} · ${s.posicion} — ${equipos[s.equipo].nombre}` : 'Toca un número o un jugador en la cancha.'}
          </span>
        </div>
        {s && (
          <button
            type="button"
            onClick={() => onElegir('')}
            className="btn-lift flex h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-900"
          >
            <Cerrar />
            Quitar selección
          </button>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-3">
        {(['local', 'visita'] as Lado[]).map((lado) => {
          const c = COLOR[lado].fuerte
          const lista = jugadores.filter((p) => p.equipo === lado)
          return (
            <div key={lado} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded" style={{ background: c }} />
                  <span className="font-display text-xl font-bold text-slate-900">{equipos[lado].nombre}</span>
                </div>
                <span className="text-xs text-slate-600">{equipos[lado].unidad} · {lista.length}</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                {lista.map((p) => {
                  const sel = p.id === seleccion
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={sel}
                      aria-label={`#${p.numero} · ${p.posicion}`}
                      onClick={() => onElegir(sel ? '' : p.id)}
                      className="btn-lift flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-1.5"
                      style={{
                        borderColor: sel ? c : '#e2e8f0',
                        background: sel ? c : '#ffffff',
                        color: sel ? '#ffffff' : c,
                        opacity: !seleccion || sel ? 1 : 0.7,
                      }}
                    >
                      <span className="font-display text-2xl font-bold leading-none">{p.numero}</span>
                      <span className="text-[11px] font-semibold tracking-[0.06em]">{p.pos}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {s && <TarjetaJugador jugador={s} equipo={equipos[s.equipo]} onCerrar={() => onElegir('')} />}
    </div>
  )
}

function TarjetaJugador({ jugador: s, equipo, onCerrar }: { jugador: Jugador; equipo: Equipo; onCerrar: () => void }) {
  const c = COLOR[s.equipo]
  return (
    <article
      key={s.id}
      aria-live="polite"
      className="card-in relative flex flex-wrap items-stretch gap-5 rounded-[18px] border border-slate-200 bg-white p-[18px] shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
    >
      <div className="relative flex h-[140px] flex-[0_0_120px] items-center justify-center rounded-[14px]" style={{ background: c.suave }}>
        <svg viewBox="-40 -45 80 90" height="118" aria-hidden="true">
          <FiguraJugador x={0} y={0} numero={s.numero} lado={s.equipo} conBalon={s.pos === 'QB'} animado={false} />
        </svg>
        <span className="absolute left-2.5 top-2 font-display text-[26px] font-bold" style={{ color: c.fuerte }}>#{s.numero}</span>
      </div>

      <div className="flex min-w-0 flex-[1_1_200px] flex-col justify-center gap-2 pr-10 sm:pr-0">
        <span className="self-start rounded-full px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.06em] text-white" style={{ background: c.fuerte }}>
          {equipo.nombre}
        </span>
        <h3 className="m-0 font-display text-[30px] font-bold leading-none text-slate-900">{s.nombre}</h3>
        <span className="text-sm text-slate-600">{s.posicion}</span>
        <div className="mt-1 flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Rendimiento</span>
            <span className="font-semibold text-slate-900">{s.rendimiento}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-[5px] bg-slate-200">
            <div className="h-full rounded-[5px] transition-[width] duration-[600ms]" style={{ width: `${s.rendimiento}%`, background: c.fuerte }} />
          </div>
        </div>
      </div>

      <div className="grid flex-[2_1_300px] grid-cols-3 content-center gap-2.5">
        {s.estadisticas.map((e) => (
          <div key={e.etiqueta} className="flex flex-col gap-0.5 rounded-xl p-3" style={{ background: c.suave }}>
            <span className="text-[11px] text-slate-900">{e.etiqueta}</span>
            <span className="font-display text-[30px] font-bold leading-tight text-slate-900">{e.valor}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Cerrar tarjeta del jugador"
        onClick={onCerrar}
        className="btn-lift absolute right-2.5 top-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-900"
      >
        <Cerrar />
      </button>
    </article>
  )
}
