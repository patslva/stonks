import { ArrowUpRight } from 'lucide-react'

export default function Header() {
  return (
    <header className="relative overflow-hidden rounded-xl border border-emerald-500/10 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent p-6">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{"🚀📈"}</span>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl text-white">
            r/WallStreetBets Dashboard
          </h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Real-time sentiment and trends from the world&apos;s most degenerate trading floor.
        </p>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 rounded-xl ring-1 ring-inset ring-white/5" />
    </header>
  )
}
