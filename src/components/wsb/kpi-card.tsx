"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type Props = {
  label?: string
  value?: number | string
  delta?: string
  icon?: LucideIcon
}

export default function KpiCard({
  label = "Metric",
  value = 0,
  delta = "",
  icon: Icon,
}: Props) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-emerald-500/15 bg-zinc-900/60",
      "hover:border-emerald-500/30 hover:shadow-sm hover:shadow-emerald-500/10 transition"
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</div>
            {delta ? <p className="mt-1 text-xs text-muted-foreground">{delta}</p> : null}
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-400">
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </div>
        </div>
      </CardContent>
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
    </Card>
  )
}
