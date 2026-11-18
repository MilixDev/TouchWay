import {
  CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { apellido, COLOR_EVALUADO, COLOR_RECEPTOR, type Caso } from '../types'

interface Props {
  caso: Caso
  frame: number
}

const EJE = { fontSize: 11, fill: '#475569' }

/** Evolución del IPC de los 3 receptores en zona, sincronizada con el reproductor. */
export default function GraficaIPC({ caso, frame }: Props) {
  const ids = caso.frames[0]?.objetivos.map((o) => o.id) ?? []
  const nombre = new Map(caso.jugadores.map((j) => [j.id, apellido(j.nombre)]))
  const datos = caso.frames.map((f) => {
    const fila: Record<string, number> = { t: f.t }
    for (const o of f.objetivos) fila[`r${o.id}`] = o.ipc
    return fila
  })
  const tActual = caso.frames[Math.min(frame, caso.frames.length - 1)]?.t ?? 0
  const tIni = caso.frames[caso.inicioVentana]?.t ?? 0
  const tFin = caso.frames[caso.frames.length - 1]?.t ?? 0

  return (
    <div className="h-[230px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="t" type="number" domain={[0, tFin]} tick={EJE} tickLine={false} axisLine={{ stroke: '#cbd5e1' }}
            tickFormatter={(v: number) => `${v.toFixed(1)}s`}
          />
          <YAxis domain={[0, 1]} ticks={[0, 0.4, 0.65, 1]} tick={EJE} tickLine={false} axisLine={false} />
          <ReferenceArea x1={tIni} x2={tFin} fill={COLOR_EVALUADO} fillOpacity={0.12} stroke="none" />
          <ReferenceLine y={0.65} stroke="#ef4444" strokeDasharray="4 4" />
          <ReferenceLine y={0.4} stroke="#f59e0b" strokeDasharray="4 4" />
          <ReferenceLine x={tActual} stroke="#0f2342" strokeWidth={2} />
          <Tooltip
            labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s desde el snap`}
            formatter={(v, n) => [Number(v).toFixed(2), String(n)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {ids.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={`r${id}`}
              name={nombre.get(id) ?? String(id)}
              stroke={COLOR_RECEPTOR[i % COLOR_RECEPTOR.length]}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
