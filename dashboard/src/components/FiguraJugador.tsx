import type { Lado } from '../types'

/** Sprites de cada lado (rutas relativas, sin diagonal inicial). Todos miran a la derecha. */
export const SPRITES: Record<Lado, { cuadro1: string; cuadro2: string; balon: string }> = {
  off: {
    cuadro1: 'img/jugadores/local-1.png',
    cuadro2: 'img/jugadores/local-2.png',
    balon: 'img/jugadores/local-balon.png',
  },
  def: {
    cuadro1: 'img/jugadores/visita-1.png',
    cuadro2: 'img/jugadores/visita-2.png',
    balon: 'img/jugadores/visita-balon.png',
  },
}

interface Props {
  x: number
  y: number
  lado: Lado
  /** Alto del sprite en unidades SVG; el ancho guarda la proporción 66:80. */
  alto?: number
  conBalon?: boolean
  /** Desfase de la animación de carrera, para que no corran todos al mismo tiempo. */
  retraso?: string
}

/**
 * Jugador en la cancha, centrado en (x, y). Alterna dos cuadros para simular que corre;
 * con balón rebota. La defensa se dibuja en espejo para que mire hacia el ataque.
 */
export default function FiguraJugador({ x, y, lado, alto = 80, conBalon = false, retraso = '0s' }: Props) {
  const ancho = (alto * 66) / 80
  const s = SPRITES[lado]
  const espejo = lado === 'def'
  const ix = espejo ? -(x + ancho / 2) : x - ancho / 2
  const iy = y - alto / 2
  const tf = espejo ? 'scale(-1 1)' : undefined

  if (conBalon) {
    return (
      <g transform={tf}>
        <image className="bob" href={s.balon} x={ix} y={iy} width={ancho} height={alto} />
      </g>
    )
  }
  return (
    <g transform={tf}>
      <image className="f1" href={s.cuadro1} x={ix} y={iy} width={ancho} height={alto} style={{ animationDelay: retraso }} />
      <image className="f2" href={s.cuadro2} x={ix} y={iy} width={ancho} height={alto} style={{ animationDelay: retraso }} />
    </g>
  )
}
