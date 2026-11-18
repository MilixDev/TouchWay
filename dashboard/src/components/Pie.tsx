export default function Pie({ fuente }: { fuente: string }) {
  return (
    <footer className="-mx-6 -mb-10 -mt-5 flex flex-wrap items-center justify-between gap-5 border-t border-white/10 bg-marino-profundo px-6 pb-8 pt-7 text-white">
      <div className="flex items-center gap-3.5">
        <img src="img/logo-enes.png" alt="Logo ENES Juriquilla" className="h-12 w-[34px] object-contain" />
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-xl font-bold tracking-[0.02em]">Hecho en ENES Juriquilla</span>
          <span className="text-xs text-[#b6c2d6]">UNAM · Querétaro, México</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[13px] text-[#b6c2d6]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 21h18M6 17v-6M11 17V5M16 17v-9M21 17v-3" />
        </svg>
        Analíticas de juego de fútbol americano
      </div>
      <span className="text-xs text-[#b6c2d6]">© 2026 Wave Touch · {fuente}</span>
    </footer>
  )
}
