export type Estatus = 'PRIORIDAD' | 'ALERTA' | 'SEÑUELO'
export type Lado = 'off' | 'def'

export interface Grupo {
  jugadas: number
  completos: number | null
  yardas: number | null
  exito: number | null
}

export interface Kpis {
  jugadas: number
  evaluaciones: number
  defensores: number
  umbral: number
  ctiAlto: Grupo
  ctiBajo: Grupo
  ventanaSegundos: number
}

export interface FilaLeaderboard {
  nflId: number
  nombre: string
  posicion: string
  equipo: string
  jugadas: number
  cti: number
  lecturasCorrectas: number
}

export interface JugadorCaso {
  id: number
  nombre: string
  pos: string
  numero: number | null
  lado: Lado
  rol: number
}

export interface Objetivo {
  id: number
  ipc: number
  estatus: Estatus
  enZona: boolean
  orfandad: number
  mirada: number
  primerDown: number
}

export interface FrameCaso {
  frameId: number
  t: number
  evento: string | null
  xy: ([number, number] | null)[]
  balon: [number, number] | null
  oQB: number | null
  /** Velocidad del defensor evaluado: [yd/s, dirección en grados NGS]. */
  velDef: [number, number] | null
  objetivos: Objetivo[]
}

export type VistaJugadores = 'puntos' | 'sprites'

export type TipoCaso = 'elite' | 'senuelo' | 'neutral'

/** Resumen de una jugada en el buscador (sin frames). */
export interface ResumenJugada {
  id: string
  gameId: number
  playId: number
  nflId: number
  defensor: string
  pos: string
  ataque: string
  defensa: string
  semana: number
  cuarto: number
  down: number
  yardsToGo: number
  resultado: 'C' | 'I' | 'IN'
  yardas: number
  cti: number
  tipo: TipoCaso
}

export interface Caso {
  id: string
  tipo: TipoCaso
  gameId: number
  playId: number
  semana: number
  descripcion: string
  ataque: string
  defensa: string
  marcadorAtaque: number
  marcadorDefensa: number
  reloj: string
  cuarto: number
  down: number
  yardsToGo: number
  resultado: 'C' | 'I' | 'IN'
  yardas: number
  cobertura: string | null
  los: number
  primerDown: number
  cti: number
  veredicto: string
  defensor: { id: number; nombre: string; pos: string }
  receptorPrioritario: { id: number; nombre: string }
  seMovioHacia: { id: number; nombre: string }
  inicioVentana: number
  jugadores: JugadorCaso[]
  frames: FrameCaso[]
}

export interface DatosCoverage {
  estado: 'listo'
  kpis: Kpis
  leaderboardTop: FilaLeaderboard[]
  leaderboardBottom: FilaLeaderboard[]
  minJugadas: number
  distribucion: { desde: number; hasta: number; n: number }[]
  casos: Caso[]
  meta: { segundos: number; partidos: number; fuente: string }
}

export type RespuestaCoverage =
  | DatosCoverage
  | { estado: 'calculando'; progreso: number }
  | { estado: 'error'; mensaje: string }

/** Colores de cada lado (mismos que el diseño original: azul local, naranja visita). */
export const COLOR: Record<Lado, { fuerte: string; suave: string; claro: string }> = {
  off: { fuerte: '#1d4ed8', suave: '#dbeafe', claro: '#60a5fa' },
  def: { fuerte: '#c2410c', suave: '#ffedd5', claro: '#fb923c' },
}

export const COLOR_ESTATUS: Record<Estatus, string> = {
  PRIORIDAD: '#ef4444',
  ALERTA: '#f59e0b',
  SEÑUELO: '#22c55e',
}

/** Colores de identidad de los 3 receptores en la gráfica (distintos a los de estatus). */
export const COLOR_RECEPTOR = ['#0284c7', '#c026d3', '#0f172a']

export const COLOR_EVALUADO = '#e879f9'

export const ROL = { QB: 1, RUTA: 2, COBERTURA: 3, DEFENSA: 4 } as const

export const NOMBRE_ROL: Record<number, string> = {
  0: 'Protección',
  1: 'Quarterback',
  2: 'Ruta de pase',
  3: 'Cobertura',
  4: 'Presión / otra',
}

export const RESULTADO: Record<Caso['resultado'], string> = { C: 'Completo', I: 'Incompleto', IN: 'Intercepción' }

export function apellido(nombre: string) {
  const partes = nombre.trim().split(/\s+/)
  return partes.length > 1 ? partes.slice(1).join(' ') : nombre
}

export function colorCti(cti: number) {
  if (cti > 0.25) return '#16a34a'
  if (cti < -0.15) return '#dc2626'
  return '#d97706'
}

export function signo(v: number, dec = 2) {
  return `${v > 0 ? '+' : ''}${v.toFixed(dec)}`
}
