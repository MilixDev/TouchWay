import FotoJugador from './FotoJugador'
import { apellido, COLOR, COLOR_ESTATUS, COLOR_RECEPTOR, colorCti, RESULTADO, signo, type Caso, type FrameCaso } from '../types'

const ASIDE = 'flex min-w-0 flex-[1_1_250px] flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white/80 p-[18px]'

function Factor({ etiqueta, valor, color }: { etiqueta: string; valor: number; color: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2 text-[11px] text-slate-600">
      <span>{etiqueta}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${valor * 100}%`, background: color }} />
      </div>
      <span className="text-right font-semibold tabular-nums text-slate-900">{valor.toFixed(2)}</span>
    </div>
  )
}

/** Panel izquierdo (ataque): los 3 receptores en la zona del defensor y su IPC en este frame. */
export function PanelAmenazas({ caso, frame }: { caso: Caso; frame: FrameCaso }) {
  const nombre = new Map(caso.jugadores.map((j) => [j.id, j]))
  const orden = caso.frames[0]?.objetivos.map((o) => o.id) ?? []
  const objetivos = [...frame.objetivos].sort((a, b) => b.ipc - a.ipc)
  return (
    <aside className={`slide-l ${ASIDE}`}>
      <div className="flex flex-col">
        <span className="font-display text-[22px] font-bold leading-tight text-slate-900">Amenazas en zona</span>
        <span className="text-xs text-slate-600">{caso.ataque} · ataque · IPC en vivo</span>
      </div>
      {objetivos.map((o) => {
        const j = nombre.get(o.id)
        const c = COLOR_ESTATUS[o.estatus]
        const identidad = COLOR_RECEPTOR[orden.indexOf(o.id) % COLOR_RECEPTOR.length]
        return (
          <div key={o.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3" style={{ opacity: o.enZona ? 1 : 0.6 }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 flex-none rounded" style={{ background: identidad }} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-lg font-bold leading-tight text-slate-900">{j ? apellido(j.nombre) : o.id}</span>
                  <span className="text-[11px] text-slate-600">{j?.pos}{o.enZona ? '' : ' · fuera de las 15 yd'}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-display text-[28px] font-bold leading-none" style={{ color: c }}>{o.ipc.toFixed(2)}</span>
                <span className="rounded-full px-2 py-px text-[10px] font-bold tracking-[0.06em] text-white" style={{ background: c }}>{o.estatus}</span>
              </div>
            </div>
            <Factor etiqueta="Orfandad" valor={o.orfandad} color={COLOR.off.fuerte} />
            <Factor etiqueta="Mirada QB" valor={o.mirada} color={COLOR.off.fuerte} />
            <Factor etiqueta="1.er down" valor={o.primerDown} color={COLOR.off.fuerte} />
          </div>
        )
      })}
      <p className="m-0 text-[11px] leading-snug text-slate-500">IPC = 0.45·Orfandad + 0.35·Mirada del QB + 0.20·Peligro de 1.er down</p>
    </aside>
  )
}

/** Panel derecho (defensa): el defensor evaluado, su CTI y el veredicto táctico. */
export function PanelDefensor({ caso }: { caso: Caso }) {
  const c = colorCti(caso.cti)
  const circ = 2 * Math.PI * 36
  const arco = ((caso.cti + 1) / 2) * circ
  const mismo = caso.receptorPrioritario.id === caso.seMovioHacia.id
  const def = apellido(caso.defensor.nombre)
  const prio = caso.receptorPrioritario.nombre
  const hacia = caso.seMovioHacia.nombre

  let lectura: string
  if (caso.cti > 0.25) {
    lectura = mismo
      ? `${def} identificó a ${prio} como la amenaza real y cerró espacio directamente sobre él, ignorando las rutas de menor valor.`
      : `${def} se movió hacia ${hacia}, y su trayectoria también recortaba la ventana hacia ${prio}, el receptor de mayor IPC en su zona.`
  } else if (caso.cti < -0.15) {
    lectura = mismo
      ? `${prio} era la amenaza de mayor IPC, pero ${def} se alejó de él durante el último segundo antes del pase y le regaló espacio.`
      : `${prio} era el receptor de mayor IPC en su zona, pero ${def} persiguió a ${hacia}: mordió el señuelo y dejó libre a la amenaza real.`
  } else {
    lectura = `${def} no se comprometió con claridad: su movimiento no cerró ni abrió de forma decisiva el espacio hacia ${prio}.`
  }

  return (
    <aside className={`slide-r ${ASIDE}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-[64px] w-[88px] flex-none items-end justify-center overflow-hidden rounded-xl" style={{ background: COLOR.def.suave }}>
          <FotoJugador nflId={caso.defensor.id} nombre={caso.defensor.nombre} lado="def" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="font-display text-[22px] font-bold leading-tight text-slate-900">{caso.defensor.nombre}</span>
          <span className="text-xs text-slate-600">{caso.defensor.pos} · {caso.defensa} · defensor evaluado</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox="0 0 96 96" width="96" height="96" role="img" aria-label={`CTI ${signo(caso.cti)}`}>
          <circle cx="48" cy="48" r="36" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="48" cy="48" r="36" fill="none" stroke={c} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${arco.toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 48 48)"
          />
          <text x="48" y="54" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a" fontFamily="Barlow Condensed, sans-serif">
            {signo(caso.cti)}
          </text>
        </svg>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Coverage Triage Index</span>
          <span className="self-start rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white" style={{ background: c }}>
            {caso.veredicto}
          </span>
          <span className="text-[11px] text-slate-500">Último 1.0 s antes del pase</span>
        </div>
      </div>

      <p className="m-0 text-[13px] leading-relaxed text-slate-700">{lectura}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col rounded-[10px] p-2.5" style={{ background: COLOR.def.suave }}>
          <span className="text-[11px] text-slate-900">Mayor IPC</span>
          <span className="font-display text-lg font-bold leading-tight text-slate-900">{apellido(prio)}</span>
        </div>
        <div className="flex flex-col rounded-[10px] p-2.5" style={{ background: COLOR.def.suave }}>
          <span className="text-[11px] text-slate-900">Se movió hacia</span>
          <span className="font-display text-lg font-bold leading-tight" style={{ color: mismo ? '#15803d' : '#b91c1c' }}>{apellido(hacia)}</span>
        </div>
        <div className="col-span-2 flex flex-col rounded-[10px] p-2.5" style={{ background: COLOR.def.suave }}>
          <span className="text-[11px] text-slate-900">Resultado · cobertura {caso.cobertura ?? 'sin dato'}</span>
          <span className="font-display text-lg font-bold leading-tight text-slate-900">
            {RESULTADO[caso.resultado]}{caso.resultado === 'C' ? ` · ${caso.yardas} yardas` : ''}
          </span>
        </div>
      </div>
      <p className="m-0 text-[11px] leading-snug text-slate-500">{caso.descripcion}</p>
    </aside>
  )
}
