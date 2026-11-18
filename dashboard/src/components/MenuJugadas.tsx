import { useEffect, useRef, useState } from 'react'
import { apellido, colorCti, signo, type Caso, type ResumenJugada, type TipoCaso } from '../types'

const EQUIPOS = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LA', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS']

const RESULTADO_CORTO: Record<ResumenJugada['resultado'], string> = { C: 'Completo', I: 'Incompleto', IN: 'Intercepción' }

interface Props {
  casos: Caso[]
  actualId: string
  onElegirDestacada: (id: string) => void
  onElegirJugada: (r: ResumenJugada) => void
}

function Fila({ titulo, detalle, cti, sel, onClick }: { titulo: string; detalle: string; cti: number; sel: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={sel}
      onClick={onClick}
      className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[10px] px-3 py-1.5 text-left transition-colors hover:bg-slate-100 ${sel ? 'bg-blue-50' : ''}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-slate-900">{titulo}</span>
        <span className="truncate text-xs text-slate-500">{detalle}</span>
      </span>
      <span className="flex-none font-display text-lg font-bold tabular-nums" style={{ color: colorCti(cti) }}>{signo(cti)}</span>
    </button>
  )
}

const SELECT = 'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:border-enes focus:outline-none'

/** Contenido del menú del marcador: jugadas destacadas y buscador de cualquier jugada. */
export default function MenuJugadas({ casos, actualId, onElegirDestacada, onElegirJugada }: Props) {
  const [pestana, setPestana] = useState<'destacadas' | 'buscar'>('destacadas')
  const [q, setQ] = useState('')
  const [equipo, setEquipo] = useState('')
  const [tipo, setTipo] = useState<TipoCaso | ''>('')
  const [resultado, setResultado] = useState('')
  const [res, setRes] = useState<{ total: number; jugadas: ResumenJugada[] } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [falla, setFalla] = useState('')
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pestana === 'buscar') entrada.current?.focus()
  }, [pestana])

  // Búsqueda con una pequeña espera para no pedir en cada tecla
  useEffect(() => {
    if (pestana !== 'buscar') return
    const ctrl = new AbortController()
    const t = window.setTimeout(() => {
      setCargando(true)
      const params = new URLSearchParams({ q, equipo, tipo, resultado, limite: '40' })
      fetch(`api/jugadas?${params}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(r.status === 503 ? 'Las analíticas siguen calculándose' : `HTTP ${r.status}`)
          return r.json()
        })
        .then((d) => { setRes(d); setFalla('') })
        .catch((e: Error) => { if (e.name !== 'AbortError') setFalla(e.message) })
        .finally(() => setCargando(false))
    }, 250)
    return () => { window.clearTimeout(t); ctrl.abort() }
  }, [pestana, q, equipo, tipo, resultado])

  const grupos: { tipo: TipoCaso; titulo: string }[] = [
    { tipo: 'elite', titulo: 'Lectura élite · CTI positivo' },
    { tipo: 'senuelo', titulo: 'Mordió el señuelo · CTI negativo' },
  ]

  return (
    <div className="flex min-h-0 flex-col">
      <div role="tablist" aria-label="Tipo de lista" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(['destacadas', 'buscar'] as const).map((p) => (
          <button
            key={p} type="button" role="tab" aria-selected={pestana === p} onClick={() => setPestana(p)}
            className={`h-9 rounded-lg text-sm font-semibold transition-colors ${pestana === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {p === 'destacadas' ? `Destacadas (${casos.length})` : 'Buscar jugadas'}
          </button>
        ))}
      </div>

      {pestana === 'destacadas' ? (
        <div className="mt-1 flex min-h-0 flex-col gap-0.5 overflow-auto">
          {grupos.map((g) => (
            <div key={g.tipo} className="flex flex-col gap-0.5">
              <span className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{g.titulo}</span>
              {casos.filter((c) => c.tipo === g.tipo).map((c) => (
                <Fila
                  key={c.id}
                  titulo={`${apellido(c.defensor.nombre)} · ${c.ataque} vs ${c.defensa}`}
                  detalle={`Semana ${c.semana} · Q${c.cuarto} · ${c.down}ª y ${c.yardsToGo} · ${RESULTADO_CORTO[c.resultado]}${c.resultado === 'C' ? ` ${c.yardas} yds` : ''}`}
                  cti={c.cti}
                  sel={c.id === actualId}
                  onClick={() => onElegirDestacada(c.id)}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex min-h-0 flex-col gap-2">
          <input
            ref={entrada}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre del defensor (ej. Warner, Diggs)…"
            aria-label="Buscar por nombre del defensor"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-enes focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-1.5">
            <select value={equipo} onChange={(e) => setEquipo(e.target.value)} aria-label="Equipo" className={SELECT}>
              <option value="">Equipo</option>
              {EQUIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCaso | '')} aria-label="Veredicto" className={SELECT}>
              <option value="">Veredicto</option>
              <option value="elite">Lectura élite</option>
              <option value="neutral">Neutral</option>
              <option value="senuelo">Mordió señuelo</option>
            </select>
            <select value={resultado} onChange={(e) => setResultado(e.target.value)} aria-label="Resultado del pase" className={SELECT}>
              <option value="">Resultado</option>
              <option value="C">Completo</option>
              <option value="I">Incompleto</option>
              <option value="IN">Intercepción</option>
            </select>
          </div>
          <span className="px-1 text-[11px] text-slate-500" aria-live="polite">
            {falla
              ? falla
              : cargando && !res
                ? 'Buscando…'
                : res
                  ? `${res.total.toLocaleString('es-MX')} jugadas${res.total > res.jugadas.length ? ` · las ${res.jugadas.length} de CTI más claro` : ''}`
                  : ''}
          </span>
          <div className={`flex min-h-0 flex-col gap-0.5 overflow-auto transition-opacity ${cargando ? 'opacity-60' : ''}`}>
            {res?.jugadas.map((r) => (
              <Fila
                key={r.id}
                titulo={`${apellido(r.defensor)} (${r.pos}) · ${r.ataque} vs ${r.defensa}`}
                detalle={`Semana ${r.semana} · Q${r.cuarto} · ${r.down}ª y ${r.yardsToGo} · ${RESULTADO_CORTO[r.resultado]}${r.resultado === 'C' ? ` ${r.yardas} yds` : ''}`}
                cti={r.cti}
                sel={r.id === actualId}
                onClick={() => onElegirJugada(r)}
              />
            ))}
            {res && res.jugadas.length === 0 && (
              <p className="m-0 px-3 py-6 text-center text-sm text-slate-500">Sin jugadas con esos filtros.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
