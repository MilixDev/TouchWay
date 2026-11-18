import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface Paso {
  /** Valor de data-tour del elemento a iluminar. */
  objetivo: string
  titulo: string
  texto: string
}

export const PASOS: Paso[] = [
  {
    objetivo: 'marcador',
    titulo: 'Elige una jugada',
    texto: 'El marcador es un menú. En "Destacadas" están los mejores ejemplos de lectura élite y de señuelo; en "Buscar jugadas" puedes explorar las más de 44 mil evaluaciones por defensor, equipo, veredicto o resultado.',
  },
  {
    objetivo: 'hallazgo',
    titulo: 'El hallazgo',
    texto: 'Cuando el defensor corre hacia la amenaza real en el último segundo antes del pase, la ofensiva completa muchos menos pases que cuando persigue un señuelo.',
  },
  {
    objetivo: 'cancha',
    titulo: 'El radar en la cancha',
    texto: 'El defensor evaluado está en rosa. Sus líneas van a los 3 receptores cercanos: rojo = PRIORIDAD, ámbar = ALERTA, verde = SEÑUELO. La flecha blanca es hacia dónde corre de verdad: si apunta a la línea roja, leyó bien.',
  },
  {
    objetivo: 'vista',
    titulo: 'Puntos o sprites, y zoom',
    texto: 'Cambia entre puntos con número (estilo Next Gen Stats) y muñecos animados. Con la lupa acercas la cancha.',
  },
  {
    objetivo: 'reproductor',
    titulo: 'Reproduce la jugada',
    texto: 'Play/pausa, velocidad y la barra para ir a cualquier momento. Por defecto se detiene en el pase, que es cuando se decide el veredicto. Atajos: espacio y flechas.',
  },
  {
    objetivo: 'amenazas',
    titulo: 'Las amenazas',
    texto: 'Este panel muestra el IPC de cada receptor en vivo y sus tres factores: qué tan solo está, si el QB lo mira y qué tan cerca está del primer down.',
  },
  {
    objetivo: 'defensor',
    titulo: 'El veredicto del defensor',
    texto: 'El CTI va de −1 a +1: qué tanto corrió el defensor hacia la amenaza real. Aquí también ves a quién debía cubrir y hacia quién se fue.',
  },
  {
    objetivo: 'seleccion',
    titulo: 'Conoce a cada jugador',
    texto: 'Toca a cualquier jugador, en la cancha o en esta lista, para ver su ficha con foto. La etiqueta de color a la derecha es su IPC en vivo (receptores) o el CTI (defensor evaluado).',
  },
  {
    objetivo: 'ipc',
    titulo: 'El IPC en el tiempo',
    texto: 'Cómo cambia la prioridad de cada receptor durante la jugada. La franja rosa es el último segundo, el que cuenta para el CTI. Al bajar, la cancha te sigue en miniatura arriba.',
  },
  {
    objetivo: 'leaderboard',
    titulo: 'Quién lee mejor',
    texto: 'Los defensores con mejor y peor CTI promedio (mínimo 60 jugadas). Ojo: la métrica castiga a los safeties que retroceden por asignación, así que compáralos con su misma posición.',
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const MARGEN = 8
const ANCHO_CARTA = 340

interface Props {
  onCerrar: () => void
}

/**
 * Recorrido guiado: oscurece la página, ilumina el elemento de cada paso y desplaza la
 * pantalla hasta él. Sin dependencias externas.
 */
export default function Tutorial({ onCerrar }: Props) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const carta = useRef<HTMLDivElement>(null)
  const [altoCarta, setAltoCarta] = useState(180)
  const paso = PASOS[i]
  const ultimo = i === PASOS.length - 1

  // Lleva la pantalla al elemento del paso
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${paso.objetivo}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    el.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight * 0.6 ? 'start' : 'center' })
  }, [paso.objetivo])

  // Sigue la posición del elemento en cada cuadro (durante el scroll suave y al redimensionar)
  useEffect(() => {
    let raf = 0
    const medir = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${paso.objetivo}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setRect((prev) =>
          prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height },
        )
      } else {
        setRect(null)
      }
      raf = requestAnimationFrame(medir)
    }
    raf = requestAnimationFrame(medir)
    return () => cancelAnimationFrame(raf)
  }, [paso.objetivo])

  useLayoutEffect(() => {
    if (carta.current) setAltoCarta(carta.current.offsetHeight)
  }, [i])

  // Teclado: ← → para navegar, Esc para salir
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, PASOS.length - 1))
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
      else return
      e.preventDefault()
      e.stopImmediatePropagation() // que los atajos del reproductor no reaccionen
    }
    const bloquearEspacio = (e: KeyboardEvent) => {
      if (e.key === ' ' && !(e.target as HTMLElement).closest('button')) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', tecla, true)
    window.addEventListener('keydown', bloquearEspacio, true)
    return () => {
      window.removeEventListener('keydown', tecla, true)
      window.removeEventListener('keydown', bloquearEspacio, true)
    }
  }, [onCerrar])

  useEffect(() => {
    carta.current?.focus()
  }, [i])

  // Posición de la carta: debajo del elemento si cabe; si no, encima; si no, abajo de la pantalla
  const vw = window.innerWidth
  const vh = window.innerHeight
  const ancho = Math.min(ANCHO_CARTA, vw - 24)
  let top = vh - altoCarta - 16
  let left = (vw - ancho) / 2
  if (rect) {
    const abajo = rect.top + rect.height + MARGEN + 12
    const arriba = rect.top - MARGEN - 12 - altoCarta
    if (abajo + altoCarta < vh - 8) top = abajo
    else if (arriba > 8) top = arriba
    left = Math.min(Math.max(rect.left + rect.width / 2 - ancho / 2, 12), vw - ancho - 12)
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo">
      {/* Clic fuera: no hace nada para no salir por accidente */}
      <div className="absolute inset-0" />
      {rect ? (
        <div
          className="tour-foco pointer-events-none absolute rounded-xl"
          style={{
            top: rect.top - MARGEN,
            left: rect.left - MARGEN,
            width: rect.width + MARGEN * 2,
            height: rect.height + MARGEN * 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/65" />
      )}

      <div
        ref={carta}
        tabIndex={-1}
        className="card-in absolute flex flex-col gap-3 rounded-2xl bg-white p-4 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.45)] outline-none"
        style={{ top, left, width: ancho }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-enes">Paso {i + 1} de {PASOS.length}</span>
          <button type="button" onClick={onCerrar} aria-label="Cerrar tutorial" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <h2 id="tutorial-titulo" className="m-0 font-display text-2xl font-bold leading-tight">{paso.titulo}</h2>
        <p className="m-0 text-sm leading-relaxed text-slate-700">{paso.texto}</p>
        <div className="flex items-center gap-1" aria-hidden="true">
          {PASOS.map((_, k) => (
            <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-enes' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button" onClick={() => setI(i - 1)} disabled={i === 0}
            className="h-10 rounded-full px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30"
          >
            Atrás
          </button>
          <button
            type="button" onClick={() => (ultimo ? onCerrar() : setI(i + 1))}
            className="btn-lift h-10 rounded-full bg-marino px-5 text-sm font-semibold text-white"
          >
            {ultimo ? 'Terminar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
