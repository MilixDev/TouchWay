import { useEffect, useState } from 'react'
import type { Lado } from '../types'
import { SPRITES } from './FiguraJugador'

interface Props {
  nflId: number
  nombre: string
  lado: Lado
  conBalon?: boolean
}

/**
 * Foto real del jugador (api/foto/{nflId} redirige a ESPN o NFL.com) sobre el escudo de la
 * NFL semitransparente. Mientras carga se ve tenue; si no hay foto o no hay internet,
 * muestra el sprite del equipo.
 */
export default function FotoJugador({ nflId, nombre, lado, conBalon = false }: Props) {
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando')
  useEffect(() => setEstado('cargando'), [nflId])

  return (
    <div className="relative flex h-full w-full items-end justify-center">
      <img
        src="img/nfl-color.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-20"
      />
      {estado === 'error' ? (
        <img
          src={conBalon ? SPRITES[lado].balon : SPRITES[lado].cuadro1}
          alt=""
          className="relative h-[92%] w-auto object-contain"
          style={{ transform: lado === 'def' ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <img
          key={nflId}
          src={`api/foto/${nflId}`}
          alt={`Foto de ${nombre}`}
          loading="lazy"
          onLoad={() => setEstado('lista')}
          onError={() => setEstado('error')}
          className={`relative h-full w-full object-contain object-bottom transition-opacity duration-300 ${estado === 'lista' ? 'opacity-100' : 'animate-pulse opacity-30'}`}
        />
      )}
    </div>
  )
}
