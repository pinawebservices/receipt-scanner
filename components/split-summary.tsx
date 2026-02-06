"use client"

import { cn } from "@/lib/utils"
import type { PersonTotal } from "@/types/receipt"

interface SplitSummaryProps {
  personTotals: PersonTotal[]
}

export function SplitSummary({ personTotals }: SplitSummaryProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-foreground">Split Summary</h3>
      {personTotals.map((person) => (
        <div
          key={person.name}
          className="rounded-xl bg-card border border-border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  "bg-primary/10 text-sm font-semibold text-primary"
                )}
              >
                {person.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-foreground">{person.name}</span>
            </div>
            <span className="text-lg font-bold text-primary">
              ${person.total.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground pl-13">
            <span>Food ${person.subtotal.toFixed(2)}</span>
            <span>Tax ${person.tax.toFixed(2)}</span>
            <span>Tip ${person.tip.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
