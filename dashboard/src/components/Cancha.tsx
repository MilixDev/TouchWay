import { memo } from 'react'
import type { Jugador } from '../types'
import FiguraJugador from './FiguraJugador'

const ANCHO = 1200
const ALTO = 533

/** Pasto, yardas, marcas hash y números. No depende del estado, así que se memoriza. */
const Fondo = memo(function Fondo() {
  const franjas = [200, 400, 600, 800, 1000]
  const yardas = Array.from({ length: 21 }, (_, i) => 100 + i * 50)
  const hashes: number[] = []
  for (let x = 110; x < 1100; x += 10) if (x % 50 !== 0) hashes.push(x)
  const numeros = [10, 20, 30, 40, 50, 40, 30, 20, 10]

  return (
    <g>
      <rect x="0" y="0" width={ANCHO} height={ALTO} fill="#3f8f4a" />
      {franjas.map((x) => <rect key={x} x={x} y="0" width="100" height={ALTO} fill="#46994f" />)}
      <rect x="0" y="0" width="100" height={ALTO} fill="#1d4ed8" />
      <rect x="1100" y="0" width="100" height={ALTO} fill="#c2410c" />
      <text x="50" y="266" fill="#fff" fontSize="54" fontWeight="700" textAnchor="middle" dominantBaseline="middle" letterSpacing="10" transform="rotate(-90 50 266)">ENES</text>
      <text x="1150" y="266" fill="#fff" fontSize="54" fontWeight="700" textAnchor="middle" dominantBaseline="middle" letterSpacing="10" transform="rotate(90 1150 266)">VISITA</text>
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

interface Props {
  jugadores: Jugador[]
  seleccion: string
  onElegir: (id: string) => void
  zoom: number
}

export default function Cancha({ jugadores, seleccion, onElegir, zoom }: Props) {
  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label="Cancha con 11 jugadores por equipo"
      className="block h-auto rounded-[14px] font-display"
      style={{ width: `${zoom * 100}%` }}
    >
      <Fondo />
      <rect x="0" y="0" width={ANCHO} height={ALTO} fill="transparent" onClick={() => onElegir('')} />
      {jugadores.map((p) => {
        const sel = p.id === seleccion
        return (
          <g
            key={p.id}
            className="pl"
            role="button"
            tabIndex={0}
            aria-label={`#${p.numero} · ${p.posicion}`}
            aria-pressed={sel}
            style={{ opacity: !seleccion || sel ? 1 : 0.22 }}
            onClick={() => onElegir(sel ? '' : p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onElegir(sel ? '' : p.id)
              }
            }}
          >
            {sel && (
              <ellipse className="ring" cx={p.x} cy={p.y + 36} rx="38" ry="13" fill="#facc15" fillOpacity="0.5" stroke="#facc15" strokeWidth="3" />
            )}
            <FiguraJugador
              x={p.x}
              y={p.y}
              numero={p.numero}
              lado={p.equipo}
              conBalon={p.pos === 'QB'}
              retraso={`${(p.numero % 5) * 0.1}s`}
            />
          </g>
        )
      })}
    </svg>
  )
}
