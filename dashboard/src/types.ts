export type Lado = 'local' | 'visita'
export type Estado = 'EN VIVO' | 'FINAL' | 'PRÓXIMO'

export interface Partido {
  id: string
  jornada: number
  rival: string
  rivalCorto: string
  local: number | null
  visita: number | null
  estado: Estado
  reloj: string
}

export interface Equipo {
  nombre: string
  rol: string
  unidad: string
  yardasPase: number
  yardasCarrera: number
  terceraConvertidas: number
  terceraIntentos: number
  yardasPorCuarto: number[]
  perdidas: number
  castigos: number
}

export interface Estadistica {
  etiqueta: string
  valor: number | string
}

export interface Jugador {
  id: string
  equipo: Lado
  numero: number
  nombre: string
  pos: string
  posicion: string
  x: number
  y: number
  rendimiento: number
  estadisticas: Estadistica[]
}

export interface Generales {
  kpis: { etiqueta: string; local: number; visita: number }[]
  puntosPorCuarto: { cuarto: string; local: number; visita: number }[]
  probabilidadVictoria: { minuto: number; prob: number }[]
  comparativa: { etiqueta: string; local: number; visita: number; textoLocal: string; textoVisita: string }[]
  mapaPases: { profundidad: string; valores: number[] }[]
}

export interface Tablero {
  partidos: Partido[]
  partidoActual: string
  equipos: Record<Lado, Equipo>
  jugadores: Jugador[]
  generales: Generales
  fuente: string
}

/** Colores de cada equipo, usados en SVG y estilos en línea. */
export const COLOR: Record<Lado, { fuerte: string; suave: string; claro: string }> = {
  local: { fuerte: '#1d4ed8', suave: '#dbeafe', claro: '#60a5fa' },
  visita: { fuerte: '#c2410c', suave: '#ffedd5', claro: '#fb923c' },
}
