import { COLOR, type Equipo, type Lado } from '../types'

interface Props {
  equipo: Equipo
  lado: Lado
}

/** Analíticas laterales de un equipo (se muestran u ocultan desde la cancha). */
export default function PanelEquipo({ equipo, lado }: Props) {
  const c = COLOR[lado]
  const total = equipo.yardasPase + equipo.yardasCarrera
  const pctPase = total ? Math.round((equipo.yardasPase / total) * 100) : 0
  const pctTercera = equipo.terceraIntentos ? Math.round((equipo.terceraConvertidas / equipo.terceraIntentos) * 100) : 0

  // Dona de eficiencia en 3ª oportunidad.
  const circ = 2 * Math.PI * 36
  const arco = (pctTercera / 100) * circ

  // Barras de yardas por cuarto.
  const maxQ = Math.max(...equipo.yardasPorCuarto, 1)
  const escala = 60 / Math.max(maxQ, 120)

  return (
    <aside
      className={`${lado === 'local' ? 'slide-l' : 'slide-r'} flex min-w-0 flex-[1_1_250px] flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white/80 p-[18px]`}
    >
      <div className="flex flex-col">
        <span className="font-display text-[22px] font-bold leading-tight text-slate-900">{equipo.nombre}</span>
        <span className="text-xs text-slate-600">{equipo.rol}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-600">Yardas totales</span>
          <span className="font-display text-[34px] font-bold leading-none" style={{ color: c.fuerte }}>{total}</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-[5px] bg-slate-200">
          <div style={{ width: `${pctPase}%`, background: c.fuerte }} />
          <div style={{ width: `${100 - pctPase}%`, background: c.suave }} />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>Pase {equipo.yardasPase}</span>
          <span>Carrera {equipo.yardasCarrera}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox="0 0 96 96" width="96" height="96" role="img" aria-label={`Eficiencia en 3ª oportunidad: ${pctTercera}%`}>
          <circle cx="48" cy="48" r="36" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="48" cy="48" r="36" fill="none" stroke={c.fuerte} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${arco.toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 48 48)"
          />
          <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a" fontFamily="Barlow Condensed, sans-serif">
            {pctTercera}%
          </text>
        </svg>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-600">3ª oportunidad</span>
          <span className="font-display text-[22px] font-bold text-slate-900">
            {equipo.terceraConvertidas} / {equipo.terceraIntentos}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-600">Yardas por cuarto</span>
        <svg viewBox="0 0 220 86" width="100%" role="img" aria-label="Yardas por cuarto">
          <line x1="10" y1="66" x2="210" y2="66" stroke="#cbd5e1" strokeWidth="1" />
          {equipo.yardasPorCuarto.map((v, i) => {
            const h = v * escala
            const x = 22 + i * 50
            return (
              <g key={i}>
                <rect x={x} y={66 - h} width="30" height={h} rx="4" fill={c.fuerte} />
                <text x={x + 15} y={62 - h} textAnchor="middle" fontSize="11" fill="#475569">{v}</text>
                <text x={x + 15} y="80" textAnchor="middle" fontSize="11" fill="#475569">Q{i + 1}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          ['Pérdidas', equipo.perdidas],
          ['Castigos', equipo.castigos],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-col rounded-[10px] p-2.5" style={{ background: c.suave }}>
            <span className="text-[11px] text-slate-900">{etiqueta}</span>
            <span className="font-display text-2xl font-bold text-slate-900">{valor}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}
