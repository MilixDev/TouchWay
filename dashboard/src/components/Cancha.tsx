import { memo, useId, useMemo, type KeyboardEvent } from 'react'
import { apellido, COLOR, COLOR_ESTATUS, COLOR_EVALUADO, COLOR_RECEPTOR, ROL, type Caso, type VistaJugadores } from '../types'
import FiguraJugador from './FiguraJugador'

const ANCHO = 1200
const ALTO = 533
const SX = (x: number) => x * 10
const SY = (y: number) => (53.3 - y) * 10 // y hacia arriba, como en Next Gen Stats
const ALTO_SPRITE = 46

/** Pasto, yardas, marcas hash y números. Solo depende de los equipos, así que se memoriza. */
const Fondo = memo(function Fondo({ ataque, defensa }: { ataque: string; defensa: string }) {
  const franjas = [200, 400, 600, 800, 1000]
  const yardas = Array.from({ length: 21 }, (_, i) => 100 + i * 50)
  const hashes: number[] = []
  for (let x = 110; x < 1100; x += 10) if (x % 50 !== 0) hashes.push(x)
  const numeros = [10, 20, 30, 40, 50, 40, 30, 20, 10]

  return (
    <g>
      <rect x="0" y="0" width={ANCHO} height={ALTO} fill="#3f8f4a" />
      {franjas.map((x) => <rect key={x} x={x} y="0" width="100" height={ALTO} fill="#46994f" />)}
      <rect x="0" y="0" width="100" height={ALTO} fill={COLOR.off.fuerte} />
      <rect x="1100" y="0" width="100" height={ALTO} fill={COLOR.def.fuerte} />
      <text x="50" y="266" fill="#fff" fontSize="54" fontWeight="700" textAnchor="middle" dominantBaseline="middle" letterSpacing="10" transform="rotate(-90 50 266)">{ataque}</text>
      <text x="1150" y="266" fill="#fff" fontSize="54" fontWeight="700" textAnchor="middle" dominantBaseline="middle" letterSpacing="10" transform="rotate(90 1150 266)">{defensa}</text>
      {yardas.map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2={ALTO} stroke="#fff" strokeOpacity=".9" strokeWidth={x === 100 || x === 1100 ? 5 : 2} />
      ))}
      <g stroke="#fff" strokeOpacity=".75" strokeWidth="2">
        {hashes.map((x) => (
          <g key={x}>
            <line x1={x} y1="2" x2={x} y2="14" />
            <line x1={x} y1="519" x2={x} y2="531" />
            <line x1={x} y1="200" x2={x} y2="212" />
            <line x1={x} y1="321" x2={x} y2="333" />
          </g>
        ))}
      </g>
      <g fill="#fff" fillOpacity=".85" fontSize="46" fontWeight="700" textAnchor="middle">
        {numeros.map((n, i) => {
          const x = 200 + i * 100
          return (
            <g key={x}>
              <text x={x} y="92">{n}</text>
              <text x={x} y="441" transform={`rotate(180 ${x} 441)`}>{n}</text>
            </g>
          )
        })}
      </g>
    </g>
  )
})

/** Encuadre horizontal alrededor de la acción (mínimo 70 yardas, dentro de la cancha). */
function encuadre(caso: Caso): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const f of caso.frames) {
    for (const p of f.xy) {
      if (!p) continue
      if (p[0] < min) min = p[0]
      if (p[0] > max) max = p[0]
    }
  }
  let x0 = Math.max(0, min - 10)
  let x1 = Math.min(120, max + 10)
  const falta = 70 - (x1 - x0)
  if (falta > 0) {
    x0 = Math.max(0, x0 - falta / 2)
    x1 = Math.min(120, x0 + 70)
    x0 = Math.max(0, x1 - 70)
  }
  return [x0, x1]
}

interface Props {
  caso: Caso
  frame: number
  seleccion: number | null
  onElegir: (id: number | null) => void
  zoom: number
  /** Solo lectura (la miniatura): sin clics ni foco en los jugadores. */
  estatica?: boolean
  /** Muestra la cancha entera (0-120 yd) en lugar de encuadrar la acción. */
  completa?: boolean
  /** Puntos con número (estilo Next Gen Stats) o sprites animados. */
  vista?: VistaJugadores
}

const RADIO_PUNTO = 10

export default function Cancha({ caso, frame, seleccion, onElegir, zoom, estatica = false, completa = false, vista = 'puntos' }: Props) {
  const puntos = vista === 'puntos'
  const [x0, x1] = useMemo<[number, number]>(() => (completa ? [0, 120] : encuadre(caso)), [caso, completa])
  // id único por instancia (la cancha puede aparecer dos veces: normal y miniatura)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const idCono = `cono${uid}`
  const idFlecha = `flecha${uid}`
  const f = caso.frames[Math.min(frame, caso.frames.length - 1)]
  const idx = new Map(caso.jugadores.map((j, i) => [j.id, i]))
  const pos = (id: number) => {
    const i = idx.get(id)
    return i === undefined ? null : f.xy[i]
  }
  const def = pos(caso.defensor.id)
  const qbI = caso.jugadores.findIndex((j) => j.rol === ROL.QB)
  const qb = qbI >= 0 ? f.xy[qbI] : null
  const pies = ALTO_SPRITE * 0.42

  // Cono de visión del QB (0° = norte, sentido horario; en SVG la y crece hacia abajo)
  let cono: string | null = null
  if (qb && f.oQB !== null) {
    const a = (f.oQB * Math.PI) / 180
    const abre = (28 * Math.PI) / 180
    const r = 320
    const cx = SX(qb[0])
    const cy = SY(qb[1])
    const punta = (ang: number) => `${cx + r * Math.sin(ang)} ${cy - r * Math.cos(ang)}`
    cono = `M${cx} ${cy} L${punta(a - abre)} A${r} ${r} 0 0 1 ${punta(a + abre)} Z`
  }

  // Dibuja primero a los más lejanos (y alta) para que los cercanos queden encima
  const orden = caso.jugadores
    .map((j, i) => ({ j, p: f.xy[i] }))
    .filter((o): o is { j: (typeof caso.jugadores)[number]; p: [number, number] } => o.p !== null)
    .sort((a, b) => b.p[1] - a.p[1])

  const balonLibre = f.balon && qb && Math.hypot(f.balon[0] - qb[0], f.balon[1] - qb[1]) > 1.5

  // Estelas: ruta recorrida hasta este frame por los 3 receptores y el defensor evaluado
  const fi = Math.min(frame, caso.frames.length - 1)
  const idsReceptores = caso.frames[0]?.objetivos.map((o) => o.id) ?? []
  const estela = (id: number) => {
    const i = idx.get(id)
    if (i === undefined) return ''
    const pts: string[] = []
    for (let k = 0; k <= fi; k++) {
      const p = caso.frames[k].xy[i]
      if (p) pts.push(`${SX(p[0]).toFixed(1)},${SY(p[1]).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  // Flecha de velocidad del defensor: lo que avanza en 1 s (1 yd = 10 unidades)
  let flecha: { x2: number; y2: number; s: number } | null = null
  if (def && f.velDef && f.velDef[0] >= 0.3) {
    const [s, dir] = f.velDef
    const a = (dir * Math.PI) / 180
    flecha = { x2: SX(def[0]) + s * 10 * Math.sin(a), y2: SY(def[1]) - s * 10 * Math.cos(a), s }
  }
  const altoEtiqueta = puntos ? RADIO_PUNTO + 22 : ALTO_SPRITE + 14

  return (
    <svg
      viewBox={`${SX(x0)} 0 ${SX(x1 - x0)} ${ALTO}`}
      role="img"
      aria-label={`Jugada ${caso.ataque} vs ${caso.defensa}: radar de ${caso.defensor.nombre}`}
      className="block h-auto rounded-[14px] font-display"
      style={{ width: `${zoom * 100}%` }}
    >
      <defs>
        <radialGradient id={idCono} gradientUnits="userSpaceOnUse" cx={qb ? SX(qb[0]) : 0} cy={qb ? SY(qb[1]) : 0} r="320">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <marker id={idFlecha} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#ffffff" />
        </marker>
      </defs>
      <Fondo ataque={caso.ataque} defensa={caso.defensa} />
      {!estatica && <rect x="0" y="0" width={ANCHO} height={ALTO} fill="transparent" onClick={() => onElegir(null)} />}

      {/* Línea de golpeo y de 1.º y 10 */}
      <line x1={SX(caso.los)} y1="0" x2={SX(caso.los)} y2={ALTO} stroke="#3b82f6" strokeWidth="5" />
      {caso.primerDown < 110 && (
        <line x1={SX(caso.primerDown)} y1="0" x2={SX(caso.primerDown)} y2={ALTO} stroke="#eab308" strokeWidth="5" />
      )}

      {cono && <path d={cono} fill={`url(#${idCono})`} pointerEvents="none" />}

      {/* Estelas de las rutas */}
      <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {idsReceptores.map((id, i) => (
          <polyline key={id} points={estela(id)} stroke={COLOR_RECEPTOR[i % COLOR_RECEPTOR.length]} strokeWidth="4" strokeOpacity=".75" />
        ))}
        <polyline points={estela(caso.defensor.id)} stroke={COLOR_EVALUADO} strokeWidth="4" strokeOpacity=".9" strokeDasharray="2 7" />
      </g>

      {/* Radar: defensor evaluado → receptores */}
      {def && (
        <g pointerEvents="none" strokeLinecap="round">
          {f.objetivos.map((o) => {
            const r = pos(o.id)
            if (!r) return null
            const color = COLOR_ESTATUS[o.estatus]
            const ancho = o.estatus === 'PRIORIDAD' ? 6 : o.estatus === 'ALERTA' ? 4 : 3
            const props = { x1: SX(def[0]), y1: SY(def[1]), x2: SX(r[0]), y2: SY(r[1]) }
            return (
              <g key={o.id} opacity={o.enZona ? 1 : 0.4}>
                <line {...props} stroke="#0f172a" strokeOpacity=".45" strokeWidth={ancho + 4} />
                <line
                  {...props}
                  className={o.estatus === 'PRIORIDAD' ? 'radar-pulso' : undefined}
                  stroke={color}
                  strokeWidth={ancho}
                  strokeDasharray={o.estatus === 'SEÑUELO' ? '10 9' : undefined}
                />
              </g>
            )
          })}
        </g>
      )}

      {/* Velocidad real del defensor evaluado */}
      {def && flecha && (
        <g pointerEvents="none" strokeLinecap="round">
          <line x1={SX(def[0])} y1={SY(def[1])} x2={flecha.x2} y2={flecha.y2} stroke="#0f172a" strokeOpacity=".55" strokeWidth="9" />
          <line x1={SX(def[0])} y1={SY(def[1])} x2={flecha.x2} y2={flecha.y2} stroke="#ffffff" strokeWidth="5" markerEnd={`url(#${idFlecha})`} />
          <text
            x={flecha.x2 + (flecha.x2 >= SX(def[0]) ? 10 : -10)} y={flecha.y2 + 5}
            textAnchor={flecha.x2 >= SX(def[0]) ? 'start' : 'end'}
            fontFamily="Inter, system-ui, sans-serif" fontSize="14" fontWeight="700"
            fill="#ffffff" stroke="#0f172a" strokeWidth="3" paintOrder="stroke"
          >
            {flecha.s.toFixed(1)} yd/s
          </text>
        </g>
      )}

      {/* Jugadores */}
      {orden.map(({ j, p }) => {
        const sel = j.id === seleccion
        const evaluado = j.id === caso.defensor.id
        const x = SX(p[0])
        const y = SY(p[1])
        return (
          <g
            key={j.id}
            className={estatica ? undefined : 'pl'}
            style={{ opacity: seleccion === null || sel ? 1 : 0.3 }}
            {...(estatica ? {} : {
              role: 'button',
              tabIndex: 0,
              'aria-label': `#${j.numero ?? ''} ${j.nombre} · ${j.pos}`,
              'aria-pressed': sel,
              onClick: () => onElegir(sel ? null : j.id),
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onElegir(sel ? null : j.id)
                }
              },
            })}
          >
            {puntos ? (
              <>
                {evaluado && <circle className="ring" cx={x} cy={y} r={RADIO_PUNTO + 9} fill={COLOR_EVALUADO} fillOpacity="0.3" stroke={COLOR_EVALUADO} strokeWidth="3" />}
                {sel && <circle className="ring" cx={x} cy={y} r={RADIO_PUNTO + 13} fill="#facc15" fillOpacity="0.4" stroke="#facc15" strokeWidth="3" />}
                <circle cx={x} cy={y} r={RADIO_PUNTO} fill={evaluado ? COLOR_EVALUADO : COLOR[j.lado].fuerte} stroke="#ffffff" strokeWidth="2" />
                {j.rol === ROL.QB && <circle cx={x} cy={y} r={RADIO_PUNTO + 4} fill="none" stroke="#ffffff" strokeWidth="2" />}
                <text x={x} y={y + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#ffffff">{j.numero ?? ''}</text>
              </>
            ) : (
              <>
                {evaluado && (
                  <ellipse className="ring" cx={x} cy={y + 4} rx="30" ry="11" fill={COLOR_EVALUADO} fillOpacity="0.35" stroke={COLOR_EVALUADO} strokeWidth="3" />
                )}
                {sel && (
                  <ellipse className="ring" cx={x} cy={y + 4} rx="34" ry="12" fill="#facc15" fillOpacity="0.45" stroke="#facc15" strokeWidth="3" />
                )}
                <FiguraJugador
                  x={x}
                  y={y - pies}
                  lado={j.lado}
                  alto={ALTO_SPRITE}
                  conBalon={j.rol === ROL.QB}
                  retraso={`${((j.numero ?? 0) % 5) * 0.1}s`}
                />
              </>
            )}
          </g>
        )
      })}

      {(balonLibre || puntos) && f.balon && (
        <ellipse cx={SX(f.balon[0])} cy={SY(f.balon[1])} rx="7" ry="4.5" fill="#7c2d12" stroke="#fff" strokeWidth="1.5" pointerEvents="none" />
      )}

      {/* Etiqueta del jugador seleccionado (debajo, para no chocar con la del IPC) */}
      {seleccion !== null && (() => {
        const p = pos(seleccion)
        const j = caso.jugadores[idx.get(seleccion) ?? -1]
        if (!p || !j) return null
        const texto = `#${j.numero ?? '–'} ${apellido(j.nombre)} · ${j.pos}`
        const w = texto.length * 8.6 + 20
        const x = Math.min(Math.max(SX(p[0]), SX(x0) + w / 2 + 4), SX(x1) - w / 2 - 4)
        const y = Math.min(SY(p[1]) + (puntos ? RADIO_PUNTO + 26 : 30), ALTO - 18)
        return (
          <g pointerEvents="none" fontFamily="Inter, system-ui, sans-serif" fontSize="15" fontWeight="700">
            <rect x={x - w / 2} y={y - 14} width={w} height="26" rx="13" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
            <text x={x} y={y + 4} textAnchor="middle" fill="#0f172a">{texto}</text>
          </g>
        )
      })()}

      {/* Etiquetas de IPC sobre los receptores */}
      <g pointerEvents="none" fontFamily="Inter, system-ui, sans-serif" fontSize="15" fontWeight="600">
        {f.objetivos.map((o) => {
          const r = pos(o.id)
          if (!r) return null
          const j = caso.jugadores[idx.get(o.id)!]
          const texto = `${apellido(j.nombre)}: ${o.ipc.toFixed(2)}`
          const w = texto.length * 8.4 + 18
          const x = SX(r[0])
          const y = SY(r[1]) - altoEtiqueta
          return (
            <g key={o.id}>
              <rect x={x - w / 2} y={y - 15} width={w} height="26" rx="8" fill="#0f172a" fillOpacity=".88" stroke={COLOR_ESTATUS[o.estatus]} strokeWidth="2.5" />
              <text x={x} y={y + 3} textAnchor="middle" fill="#fff">{texto}</text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
