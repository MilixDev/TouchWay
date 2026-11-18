import { useEffect, useState } from 'react'
import {
  apellido, COLOR, COLOR_ESTATUS, COLOR_EVALUADO, colorCti, NOMBRE_ROL, ROL, signo,
  type Caso, type FrameCaso, type JugadorCaso, type Lado,
} from '../types'
import FotoJugador from './FotoJugador'

interface Props {
  caso: Caso
  frame: FrameCaso
  seleccion: number | null
  onElegir: (id: number | null) => void
}

const ORDEN_ROL: Record<number, number> = { [ROL.QB]: 0, [ROL.RUTA]: 1, [ROL.COBERTURA]: 0, [ROL.DEFENSA]: 2, 0: 3 }

const GRUPOS: Record<Lado, { titulo: string; roles: number[] }[]> = {
  off: [
    { titulo: 'QB y receptores', roles: [ROL.QB, ROL.RUTA] },
    { titulo: 'Protección', roles: [0] },
  ],
  def: [
    { titulo: 'Cobertura', roles: [ROL.COBERTURA] },
    { titulo: 'Presión y otros', roles: [ROL.DEFENSA] },
  ],
}

function Cerrar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Foto pequeña y redonda para las filas; si no hay foto muestra el número. */
function Avatar({ jugador, color, suave }: { jugador: JugadorCaso; color: string; suave: string }) {
  const [error, setError] = useState(false)
  useEffect(() => setError(false), [jugador.id])
  return (
    <span className="relative flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full ring-2 ring-white" style={{ background: suave }}>
      {error ? (
        <span className="font-display text-base font-bold" style={{ color }}>{jugador.numero ?? '–'}</span>
      ) : (
        <img
          src={`api/foto/${jugador.id}?tam=mini`}
          alt=""
          loading="lazy"
          onError={() => setError(true)}
          className="absolute inset-x-0 top-0 h-full w-full scale-[1.35] object-cover object-top"
          style={{ transformOrigin: '50% 15%' }}
        />
      )}
    </span>
  )
}

export default function SelectorJugador({ caso, frame, seleccion, onElegir }: Props) {
  const s = caso.jugadores.find((p) => p.id === seleccion)
  const equipo = (l: Lado) => (l === 'off' ? caso.ataque : caso.defensa)

  return (
    <div className="flex flex-col gap-3" data-tour="seleccion">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="m-0 flex items-center gap-2 font-display text-[22px] font-bold uppercase tracking-[0.04em] text-slate-900">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Jugadores de la jugada
          </h3>
          <span className="text-[13px] text-slate-500">Toca un jugador aquí o en la cancha para ver su ficha.</span>
        </div>
        {s && (
          <button
            type="button"
            onClick={() => onElegir(null)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <Cerrar size={12} />
            Quitar selección
          </button>
        )}
      </div>

      {s && <TarjetaJugador jugador={s} caso={caso} frame={frame} onCerrar={() => onElegir(null)} />}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {(['off', 'def'] as Lado[]).map((lado) => {
          const c = COLOR[lado]
          const jugadores = caso.jugadores.filter((p) => p.lado === lado)
          const grupos = GRUPOS[lado]
            .map((g) => ({
              ...g,
              lista: jugadores
                .filter((p) => g.roles.includes(p.rol))
                .sort((a, b) => (ORDEN_ROL[a.rol] ?? 9) - (ORDEN_ROL[b.rol] ?? 9) || (a.numero ?? 0) - (b.numero ?? 0)),
            }))
            .filter((g) => g.lista.length)

          return (
            <section key={lado} className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: c.fuerte }} />
                  <span className="font-display text-xl font-bold leading-none text-slate-900">{equipo(lado)}</span>
                  <span className="text-xs font-medium text-slate-500">{lado === 'off' ? 'Ofensiva' : 'Defensiva'}</span>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{jugadores.length}</span>
              </header>

              <div className="flex flex-col gap-3 p-2.5">
                {grupos.map((g) => (
                  <div key={g.titulo} className="flex flex-col gap-1">
                    <span className="px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{g.titulo}</span>
                    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-1 p-0">
                      {g.lista.map((p) => (
                        <li key={p.id}>
                          <FilaJugador
                            jugador={p}
                            caso={caso}
                            frame={frame}
                            sel={p.id === seleccion}
                            atenuado={seleccion !== null && p.id !== seleccion}
                            onClick={() => onElegir(p.id === seleccion ? null : p.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function FilaJugador({ jugador: p, caso, frame, sel, atenuado, onClick }: {
  jugador: JugadorCaso; caso: Caso; frame: FrameCaso; sel: boolean; atenuado: boolean; onClick: () => void
}) {
  const c = COLOR[p.lado]
  const evaluado = p.id === caso.defensor.id
  const objetivo = frame.objetivos.find((o) => o.id === p.id)

  return (
    <button
      type="button"
      aria-pressed={sel}
      aria-label={`#${p.numero ?? ''} ${p.nombre} · ${p.pos}`}
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-xl py-1.5 pl-3 pr-2.5 text-left transition-[background-color,opacity] duration-200 ${
        sel ? '' : 'hover:bg-slate-50'
      }`}
      style={{ background: sel ? c.suave : undefined, opacity: atenuado ? 0.6 : 1 }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 left-0 w-1 rounded-full transition-opacity"
        style={{ background: c.fuerte, opacity: sel ? 1 : 0 }}
      />
      <Avatar jugador={p} color={c.fuerte} suave={c.suave} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[15px] font-bold tabular-nums" style={{ color: c.fuerte }}>{p.numero ?? '–'}</span>
          <span className="truncate text-sm font-semibold text-slate-900">{apellido(p.nombre)}</span>
        </span>
        <span className="truncate text-[11px] text-slate-500">{p.pos} · {NOMBRE_ROL[p.rol]}</span>
      </span>
      {objetivo && (
        <span
          className="flex-none rounded-full px-2 py-0.5 font-display text-[13px] font-bold tabular-nums text-white"
          style={{ background: COLOR_ESTATUS[objetivo.estatus] }}
          title={`${objetivo.estatus} · IPC ${objetivo.ipc.toFixed(2)}`}
        >
          {objetivo.ipc.toFixed(2)}
        </span>
      )}
      {evaluado && (
        <span
          className="flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-white"
          style={{ background: COLOR_EVALUADO }}
          title={`Defensor evaluado · CTI ${signo(caso.cti)}`}
        >
          CTI {signo(caso.cti)}
        </span>
      )}
    </button>
  )
}

function TarjetaJugador({ jugador: s, caso, frame, onCerrar }: { jugador: JugadorCaso; caso: Caso; frame: FrameCaso; onCerrar: () => void }) {
  const c = COLOR[s.lado]
  const objetivo = frame.objetivos.find((o) => o.id === s.id)
  const evaluado = s.id === caso.defensor.id

  let barra: { etiqueta: string; valor: number; texto: string; color: string } | null = null
  let stats: { etiqueta: string; valor: string; color?: string }[]
  if (objetivo) {
    const max = Math.max(...caso.frames.map((f) => f.objetivos.find((o) => o.id === s.id)?.ipc ?? 0))
    barra = { etiqueta: 'IPC en este momento', valor: objetivo.ipc, texto: objetivo.ipc.toFixed(2), color: COLOR_ESTATUS[objetivo.estatus] }
    stats = [
      { etiqueta: 'Estatus', valor: objetivo.estatus, color: COLOR_ESTATUS[objetivo.estatus] },
      { etiqueta: 'IPC máximo', valor: max.toFixed(2) },
      { etiqueta: 'En zona', valor: objetivo.enZona ? 'Sí' : 'No' },
    ]
  } else if (evaluado) {
    barra = { etiqueta: 'CTI (−1 a +1)', valor: (caso.cti + 1) / 2, texto: signo(caso.cti), color: colorCti(caso.cti) }
    stats = [
      { etiqueta: 'Veredicto', valor: caso.veredicto.replace('Lectura ', ''), color: colorCti(caso.cti) },
      { etiqueta: 'Debía cubrir', valor: apellido(caso.receptorPrioritario.nombre) },
      { etiqueta: 'Fue hacia', valor: apellido(caso.seMovioHacia.nombre) },
    ]
  } else {
    stats = [
      { etiqueta: 'Rol', valor: NOMBRE_ROL[s.rol] ?? '–' },
      { etiqueta: 'Posición', valor: s.pos || '–' },
      { etiqueta: 'Número', valor: s.numero !== null ? `#${s.numero}` : '–' },
    ]
  }

  return (
    <article
      key={s.id}
      aria-live="polite"
      className="card-in relative flex flex-wrap items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.10)]"
    >
      <div
        className="relative flex h-[168px] flex-[0_0_200px] items-end justify-center overflow-hidden pt-5"
        style={{ background: `linear-gradient(160deg, ${c.suave} 0%, #ffffff 100%)` }}
      >
        <FotoJugador nflId={s.id} nombre={s.nombre} lado={s.lado} conBalon={s.rol === ROL.QB} />
        <span className="absolute left-3 top-2 font-display text-[28px] font-bold leading-none" style={{ color: c.fuerte }}>
          {s.numero ?? '–'}
        </span>
      </div>

      <div className="flex min-w-0 flex-[1_1_320px] flex-col justify-center gap-3 p-4 pr-14">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
            <span style={{ color: c.fuerte }}>{s.lado === 'off' ? caso.ataque : caso.defensa}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{s.pos} · {NOMBRE_ROL[s.rol]}</span>
            {evaluado && (
              <span className="rounded-full px-1.5 py-px text-[10px] text-white" style={{ background: COLOR_EVALUADO }}>Evaluado</span>
            )}
          </span>
          <h3 className="m-0 font-display text-[28px] font-bold leading-none text-slate-900">{s.nombre}</h3>
        </div>

        {barra && (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-xs text-slate-500">
              <span>{barra.etiqueta}</span>
              <span className="font-display text-lg font-bold leading-none" style={{ color: barra.color }}>{barra.texto}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${barra.valor * 100}%`, background: barra.color }} />
            </div>
          </div>
        )}

        <dl className="m-0 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
          {stats.map((e) => (
            <div key={e.etiqueta} className="flex min-w-0 flex-col gap-0.5 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{e.etiqueta}</dt>
              <dd className="m-0 truncate font-display text-lg font-bold leading-tight" style={{ color: e.color ?? '#0f172a' }}>{e.valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        aria-label="Cerrar ficha del jugador"
        onClick={onCerrar}
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Cerrar />
      </button>
    </article>
  )
}
