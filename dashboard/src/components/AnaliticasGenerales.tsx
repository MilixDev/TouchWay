import type { ReactNode } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { COLOR, type Equipo, type Generales, type Lado } from '../types'

const AZUL = COLOR.local.fuerte
const NARANJA = COLOR.visita.fuerte
const EJE = { fontSize: 11, fill: '#475569' }

interface Props {
  generales: Generales
  equipos: Record<Lado, Equipo>
  fuente: string
}

function Tarjeta({ titulo, leyenda = false, className = '', children }: { titulo: string; leyenda?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col gap-2.5 rounded-[14px] bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-lg font-bold uppercase tracking-[0.04em] text-slate-900">{titulo}</h3>
        {leyenda && (
          <div className="flex gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: AZUL }} />ENES</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: NARANJA }} />Visita</span>
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

/** Color del mapa de pases según el % de completos. */
function tonoPase(v: number) {
  if (v < 40) return { bg: '#dbeafe', fg: '#0f172a' }
  if (v < 55) return { bg: '#bfdbfe', fg: '#0f172a' }
  if (v < 70) return { bg: '#93c5fd', fg: '#0f172a' }
  if (v < 80) return { bg: '#2563eb', fg: '#ffffff' }
  return { bg: '#1e40af', fg: '#ffffff' }
}

export default function AnaliticasGenerales({ generales: g, equipos, fuente }: Props) {
  const nombres = { local: 'ENES', visita: 'Visita' }

  // Yardas acumuladas al final de cada cuarto.
  const acumuladas = [{ cuarto: 'Inicio', local: 0, visita: 0 }]
  for (let i = 0; i < 4; i++) {
    const prev = acumuladas[i]
    acumuladas.push({
      cuarto: `Q${i + 1}`,
      local: prev.local + (equipos.local.yardasPorCuarto[i] ?? 0),
      visita: prev.visita + (equipos.visita.yardasPorCuarto[i] ?? 0),
    })
  }
  const ultimaProb = g.probabilidadVictoria[g.probabilidadVictoria.length - 1]

  return (
    <section className="-mx-6 mt-3 flex flex-col gap-4 bg-marino px-6 pb-12 pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2.5 font-display text-[26px] uppercase tracking-[0.04em] text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18M6 17v-6M11 17V5M16 17v-9M21 17v-3" />
          </svg>
          Analíticas generales
        </h2>
        <span className="text-xs text-[#b6c2d6]">{fuente}</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {g.kpis.map((k) => (
          <div key={k.etiqueta} className="flex flex-col gap-1 rounded-xl bg-white px-3.5 py-3">
            <span className="text-[11px] uppercase tracking-[0.05em] text-slate-600">{k.etiqueta}</span>
            <div className="flex items-baseline gap-2 font-display font-bold">
              <span className="text-[28px]" style={{ color: AZUL }}>{k.local}</span>
              <span className="text-base text-slate-600">vs</span>
              <span className="text-[28px]" style={{ color: NARANJA }}>{k.visita}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tarjeta titulo="Puntos por cuarto" leyenda>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={g.puntosPorCuarto} margin={{ top: 18, right: 4, left: -24, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="cuarto" tick={EJE} axisLine={false} tickLine={false} />
                <YAxis tick={{ ...EJE, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v, n) => [v, nombres[n as Lado] ?? n]} />
                <Bar dataKey="local" fill={AZUL} radius={[3, 3, 0, 0]} minPointSize={2}>
                  <LabelList dataKey="local" position="top" fontSize={11} fontWeight={600} fill="#0f172a" />
                </Bar>
                <Bar dataKey="visita" fill={NARANJA} radius={[3, 3, 0, 0]} minPointSize={2}>
                  <LabelList dataKey="visita" position="top" fontSize={11} fontWeight={600} fill="#0f172a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Probabilidad de victoria" className="md:col-span-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={g.probabilidadVictoria} margin={{ top: 18, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  dataKey="minuto" type="number" domain={[0, 60]} ticks={[7.5, 22.5, 37.5, 52.5]}
                  tickFormatter={(v: number) => `Q${Math.floor(v / 15) + 1}`} tick={EJE} axisLine={false} tickLine={false}
                />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ ...EJE, fontSize: 10 }} axisLine={false} tickLine={false} />
                {[15, 30, 45].map((m) => <ReferenceLine key={m} x={m} stroke="#e2e8f0" />)}
                <ReferenceLine y={100} stroke="#e2e8f0" />
                <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'ENES']}
                  labelFormatter={(m) => `Minuto ${m}`}
                />
                <Area
                  type="linear" dataKey="prob" stroke={AZUL} strokeWidth={3} fill={AZUL} fillOpacity={0.12}
                  activeDot={{ r: 5 }}
                  dot={(p: { cx?: number; cy?: number; index?: number }) =>
                    p.index === g.probabilidadVictoria.length - 1 && p.cx != null && p.cy != null ? (
                      <g key="ultimo">
                        <circle cx={p.cx} cy={p.cy} r={5} fill={AZUL} />
                        <text x={p.cx - 8} y={p.cy - 9} textAnchor="end" fontSize={12} fontWeight={700} fill={AZUL}>
                          {ultimaProb?.prob}%
                        </text>
                      </g>
                    ) : (
                      <g key={`p${p.index}`} />
                    )
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Comparativa" leyenda>
          <div className="flex flex-col gap-2.5">
            {g.comparativa.map((f) => {
              const max = Math.max(f.local, f.visita, 1)
              return (
                <div key={f.etiqueta} className="flex flex-col gap-1">
                  <span className="text-center text-[11px] text-slate-600">{f.etiqueta}</span>
                  <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1">
                    <span className="font-display text-lg font-bold" style={{ color: AZUL }}>{f.textoLocal}</span>
                    <div className="flex justify-end">
                      <div className="h-3 rounded-l-md" style={{ width: `${(f.local / max) * 100}%`, background: AZUL }} />
                    </div>
                    <div className="flex">
                      <div className="h-3 rounded-r-md" style={{ width: `${(f.visita / max) * 100}%`, background: NARANJA }} />
                    </div>
                    <span className="text-right font-display text-lg font-bold" style={{ color: NARANJA }}>{f.textoVisita}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Yardas acumuladas" leyenda className="md:col-span-1">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={acumuladas} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="cuarto" tick={EJE} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v === 'Inicio' ? '' : v)} />
                <YAxis tick={{ ...EJE, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [`${v} yds`, nombres[n as Lado] ?? n]} />
                <Line type="linear" dataKey="local" stroke={AZUL} strokeWidth={3} dot={{ r: 3.5, fill: '#fff', strokeWidth: 2 }} />
                <Line type="linear" dataKey="visita" stroke={NARANJA} strokeWidth={3} dot={{ r: 3.5, fill: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Mapa de pases · % completos">
          <div className="grid grid-cols-[44px_repeat(3,minmax(0,1fr))] gap-1.5">
            {g.mapaPases.map((fila) => [
              <span key={fila.profundidad} className="self-center text-[11px] text-slate-600">{fila.profundidad}</span>,
              ...fila.valores.map((v, i) => {
                const t = tonoPase(v)
                return (
                  <div
                    key={`${fila.profundidad}-${i}`}
                    className="flex h-11 items-center justify-center rounded-lg font-display text-lg font-bold"
                    style={{ background: t.bg, color: t.fg }}
                  >
                    {v}%
                  </div>
                )
              }),
            ])}
            <span />
            {['Izq.', 'Centro', 'Der.'].map((d) => <span key={d} className="text-center text-[11px] text-slate-600">{d}</span>)}
          </div>
        </Tarjeta>
      </div>
    </section>
  )
}
