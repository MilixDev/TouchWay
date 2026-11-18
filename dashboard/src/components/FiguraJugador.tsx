import { COLOR, type Lado } from '../types'

interface Props {
  x: number
  y: number
  numero: number
  lado: Lado
  conBalon?: boolean
  /** Desfase de la animación de carrera, para que no corran todos al mismo tiempo. */
  retraso?: string
  animado?: boolean
}

/**
 * Jugador dibujado en SVG, centrado en (x, y). Ocupa unos 66 x 80 unidades.
 * Mira hacia la derecha si es local y hacia la izquierda si es visita.
 */
export default function FiguraJugador({ x, y, numero, lado, conBalon = false, retraso = '0s', animado = true }: Props) {
  const c = COLOR[lado].fuerte
  const dir = lado === 'local' ? 1 : -1
  const piernas = (a: number) => (
    <g stroke="#1e293b" strokeWidth="6" strokeLinecap="round">
      <line x1={x - 7} y1={y + 18} x2={x - 7 + a} y2={y + 33} />
      <line x1={x + 7} y1={y + 18} x2={x + 7 - a} y2={y + 33} />
    </g>
  )

  return (
    <g>
      <ellipse cx={x} cy={y + 36} rx="20" ry="5" fill="#000" fillOpacity=".22" />
      {animado && !conBalon ? (
        <>
          <g className="f1" style={{ animationDelay: retraso }}>{piernas(-5)}</g>
          <g className="f2" style={{ animationDelay: retraso }}>{piernas(5)}</g>
        </>
      ) : (
        piernas(0)
      )}
      <g className={conBalon && animado ? 'bob' : undefined}>
        {/* Brazos */}
        <line x1={x - 18} y1={y - 4} x2={x - 22} y2={y + 12} stroke={c} strokeWidth="7" strokeLinecap="round" />
        <line x1={x + 18} y1={y - 4} x2={x + 22} y2={y + 12} stroke={c} strokeWidth="7" strokeLinecap="round" />
        {/* Jersey */}
        <path
          d={`M${x - 20} ${y - 6} Q${x - 20} ${y - 12} ${x - 12} ${y - 12} H${x + 12} Q${x + 20} ${y - 12} ${x + 20} ${y - 6} L${x + 16} ${y + 20} H${x - 16} Z`}
          fill={c} stroke="#fff" strokeWidth="2"
        />
        <text
          x={x} y={y + 10} textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff"
          fontFamily="Barlow Condensed, sans-serif"
        >
          {numero}
        </text>
        {/* Casco y careta */}
        <circle cx={x} cy={y - 24} r="13" fill={c} stroke="#fff" strokeWidth="2" />
        <path
          d={`M${x + dir * 6} ${y - 30} Q${x + dir * 17} ${y - 26} ${x + dir * 14} ${y - 15}`}
          fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round"
        />
        <rect x={x - 2} y={y - 37} width="4" height="12" rx="2" fill="#fff" fillOpacity=".85" />
        {conBalon && (
          <g transform={`rotate(${dir * -25} ${x + dir * 22} ${y + 4})`}>
            <ellipse cx={x + dir * 22} cy={y + 4} rx="10" ry="6.5" fill="#7c3f12" stroke="#fff" strokeWidth="1.5" />
            <line x1={x + dir * 22 - 4} y1={y + 4} x2={x + dir * 22 + 4} y2={y + 4} stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </g>
    </g>
  )
}
