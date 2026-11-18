import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colorCti, signo, type Caso, type DatosCoverage, type FilaLeaderboard } from '../types'
import GraficaIPC from './GraficaIPC'

const ALTO = '#15803d'
const BAJO = '#b91c1c'
const EJE = { fontSize: 11, fill: '#475569' }

function Tarjeta({ titulo, extra, className = '', tour, children }: { titulo: string; extra?: ReactNode; className?: string; tour?: string; children: ReactNode }) {
  return (
    <section className={`flex min-w-0 flex-col gap-2.5 rounded-[14px] bg-white p-4 ${className}`} data-tour={tour}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-display text-lg font-bold uppercase tracking-[0.04em] text-slate-900">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  )
}

function LeyendaAltoBajo() {
  return (
    <div className="flex gap-3 text-[11px] text-slate-600">
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ALTO }} />CTI alto</span>
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: BAJO }} />CTI bajo</span>
    </div>
  )
}

function TablaLider({ filas }: { filas: FilaLeaderboard[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.05em] text-slate-500">
            <th className="py-1.5 pr-2 font-semibold">#</th>
            <th className="py-1.5 pr-2 font-semibold">Defensor</th>
            <th className="py-1.5 pr-2 font-semibold">Pos</th>
            <th className="py-1.5 pr-2 text-right font-semibold">CTI prom.</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Lect. élite</th>
            <th className="py-1.5 text-right font-semibold">Jugadas</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.nflId} className="border-t border-slate-200 text-slate-800">
              <td className="py-2 pr-2 text-slate-400">{i + 1}</td>
              <td className="py-2 pr-2">
                <span className="font-semibold">{f.nombre}</span>
                <span className="ml-1.5 text-xs text-slate-500">{f.equipo}</span>
              </td>
              <td className="py-2 pr-2 text-slate-600">{f.posicion}</td>
              <td className="py-2 pr-2 text-right font-display text-lg font-bold" style={{ color: colorCti(f.cti) }}>{signo(f.cti, 3)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{f.lecturasCorrectas.toFixed(1)}%</td>
              <td className="py-2 text-right tabular-nums text-slate-500">{f.jugadas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface Props {
  datos: DatosCoverage
  caso: Caso
  frame: number
}

export default function AnaliticasGenerales({ datos, caso, frame }: Props) {
  const { kpis } = datos
  const a = kpis.ctiAlto
  const b = kpis.ctiBajo
  const n = (v: number | null, d = 1) => (v === null ? '–' : v.toFixed(d))

  const tiles = [
    { etiqueta: 'Completos permitidos', alto: `${n(a.completos)}%`, bajo: `${n(b.completos)}%` },
    { etiqueta: 'Yardas por intento', alto: n(a.yardas, 2), bajo: n(b.yardas, 2) },
    { etiqueta: 'Éxito ofensivo permitido', alto: `${n(a.exito)}%`, bajo: `${n(b.exito)}%` },
    { etiqueta: 'Jugadas en cada grupo', alto: a.jugadas.toLocaleString('es-MX'), bajo: b.jugadas.toLocaleString('es-MX') },
  ]

  const comparativa = [
    { etiqueta: 'Completos permitidos', alto: a.completos ?? 0, bajo: b.completos ?? 0, ta: `${n(a.completos)}%`, tb: `${n(b.completos)}%` },
    { etiqueta: 'Yardas por intento', alto: a.yardas ?? 0, bajo: b.yardas ?? 0, ta: n(a.yardas, 2), tb: n(b.yardas, 2) },
    { etiqueta: 'Éxito ofensivo', alto: a.exito ?? 0, bajo: b.exito ?? 0, ta: `${n(a.exito)}%`, tb: `${n(b.exito)}%` },
  ]

  const hist = datos.distribucion.map((d) => ({ ...d, centro: (d.desde + d.hasta) / 2, rango: `${signo(d.desde, 1)} a ${signo(d.hasta, 1)}` }))

  return (
    <section className="-mx-6 mt-3 flex flex-col gap-4 bg-marino px-6 pb-12 pt-10" data-tour="analiticas">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 flex items-center gap-2.5 font-display text-[26px] uppercase tracking-[0.04em] text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18M6 17v-6M11 17V5M16 17v-9M21 17v-3" />
          </svg>
          Analíticas generales
        </h2>
        <span className="text-xs text-[#b6c2d6]">
          {datos.meta.fuente} · {kpis.jugadas.toLocaleString('es-MX')} jugadas · {kpis.evaluaciones.toLocaleString('es-MX')} evaluaciones · {kpis.defensores} defensores
        </span>
      </div>

      <p className="m-0 max-w-4xl text-sm leading-relaxed text-[#d6deeb]">
        Cuando la cobertura lee bien la amenaza (CTI de la jugada &gt; +{kpis.umbral}), la ofensiva completa{' '}
        <strong className="text-white">{n(a.completos)}%</strong> de sus pases; cuando muerde señuelos (CTI &lt; −{kpis.umbral}),{' '}
        <strong className="text-white">{n(b.completos)}%</strong>. Ventana evaluada: {kpis.ventanaSegundos.toFixed(1)} s antes del pase.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {tiles.map((k) => (
          <div key={k.etiqueta} className="flex flex-col gap-1 rounded-xl bg-white px-3.5 py-3">
            <span className="text-[11px] uppercase tracking-[0.05em] text-slate-600">{k.etiqueta}</span>
            <div className="flex items-baseline gap-2 font-display font-bold">
              <span className="text-[28px]" style={{ color: ALTO }}>{k.alto}</span>
              <span className="text-base text-slate-600">vs</span>
              <span className="text-[28px]" style={{ color: BAJO }}>{k.bajo}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Evolución del IPC"
          className="md:col-span-2"
          tour="ipc"
          extra={<span className="text-[11px] text-slate-500">Franja rosa: último 1.0 s evaluado · {caso.ataque} vs {caso.defensa}</span>}
        >
          <GraficaIPC caso={caso} frame={frame} />
        </Tarjeta>

        <Tarjeta titulo="Comparativa" extra={<LeyendaAltoBajo />}>
          <div className="flex flex-col gap-3">
            {comparativa.map((f) => {
              const max = Math.max(f.alto, f.bajo, 1)
              return (
                <div key={f.etiqueta} className="flex flex-col gap-1">
                  <span className="text-center text-[11px] text-slate-600">{f.etiqueta}</span>
                  <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_48px] items-center gap-1">
                    <span className="font-display text-lg font-bold" style={{ color: ALTO }}>{f.ta}</span>
                    <div className="flex justify-end">
                      <div className="h-3 rounded-l-md" style={{ width: `${(f.alto / max) * 100}%`, background: ALTO }} />
                    </div>
                    <div className="flex">
                      <div className="h-3 rounded-r-md" style={{ width: `${(f.bajo / max) * 100}%`, background: BAJO }} />
                    </div>
                    <span className="text-right font-display text-lg font-bold" style={{ color: BAJO }}>{f.tb}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Distribución del CTI">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hist} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={1}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="centro" type="number" domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]}
                  tick={EJE} axisLine={false} tickLine={false} tickFormatter={(v: number) => signo(v, 1)}
                />
                <YAxis tick={{ ...EJE, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { rango?: string } | undefined)?.rango ?? ''}
                  formatter={(v) => [`${Number(v).toLocaleString('es-MX')} evaluaciones`, 'Defensor-jugada']}
                />
                <Bar dataKey="n" radius={[2, 2, 0, 0]}>
                  {hist.map((d) => <Cell key={d.desde} fill={colorCti(d.centro)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Top 5 · mejor triaje" className="md:col-span-2" tour="leaderboard" extra={<span className="text-[11px] text-slate-500">mín. {datos.minJugadas} jugadas</span>}>
          <TablaLider filas={datos.leaderboardTop} />
        </Tarjeta>
        <Tarjeta titulo="Bottom 5" className="md:col-span-2" extra={<span className="text-[11px] text-slate-500">mín. {datos.minJugadas} jugadas</span>}>
          <TablaLider filas={datos.leaderboardBottom} />
        </Tarjeta>
      </div>
    </section>
  )
}
