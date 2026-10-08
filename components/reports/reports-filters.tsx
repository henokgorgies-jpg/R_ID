"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Option = {
  id: string
  name: string
  code: string
}

type ReportsFiltersProps = {
  zones: Option[]
  woredas: Option[]
  kebeles: Option[]
  selectedZoneId: string
  selectedWoredaId: string
  selectedKebeleId: string
  scopeType: "city" | "zone" | "woreda" | "kebele"
}

export function ReportsFilters({
  zones,
  woredas,
  kebeles,
  selectedZoneId,
  selectedWoredaId,
  selectedKebeleId,
  scopeType,
}: ReportsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function navigateWith(next: { zoneId?: string; woredaId?: string; kebeleId?: string }) {
    const params = new URLSearchParams(searchParams.toString())

    if (next.zoneId !== undefined) {
      if (next.zoneId) params.set("zoneId", next.zoneId)
      else params.delete("zoneId")
    }

    if (next.woredaId !== undefined) {
      if (next.woredaId) params.set("woredaId", next.woredaId)
      else params.delete("woredaId")
    }

    if (next.kebeleId !== undefined) {
      if (next.kebeleId) params.set("kebeleId", next.kebeleId)
      else params.delete("kebeleId")
    }

    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Zone</span>
          <select
            value={selectedZoneId}
            disabled={scopeType === "zone" || scopeType === "woreda" || scopeType === "kebele" || isPending}
            onChange={(event) => navigateWith({ zoneId: event.target.value, woredaId: "", kebeleId: "" })}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scopeType === "city" ? <option value="">All Zones</option> : null}
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.code} - {zone.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Woreda</span>
          <select
            value={selectedWoredaId}
            disabled={!selectedZoneId || scopeType === "woreda" || scopeType === "kebele" || isPending}
            onChange={(event) => navigateWith({ woredaId: event.target.value, kebeleId: "" })}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scopeType === "city" || scopeType === "zone" ? <option value="">All Woredas</option> : null}
            {woredas.map((woreda) => (
              <option key={woreda.id} value={woreda.id}>
                {woreda.code} - {woreda.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Kebele</span>
          <select
            value={selectedKebeleId}
            disabled={!selectedWoredaId || scopeType === "kebele" || isPending}
            onChange={(event) => navigateWith({ kebeleId: event.target.value })}
            className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scopeType !== "kebele" ? <option value="">All Kebeles</option> : null}
            {kebeles.map((kebele) => (
              <option key={kebele.id} value={kebele.id}>
                {kebele.code} - {kebele.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-none lg:w-auto"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                router.replace(pathname)
              })
            }
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-none">
          {isPending ? "Refreshing report..." : "Live filter sync"}
        </Badge>
      </div>
    </div>
  )
}
