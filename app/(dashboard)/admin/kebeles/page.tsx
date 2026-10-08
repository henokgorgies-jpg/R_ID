import { Building2, Home, Landmark, MapPinned, Users2 } from "lucide-react"
import { GeographyCreatePanel } from "@/components/admin/geography-create-panel"
import { KebelesTable } from "@/components/admin/kebeles-table"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"

export default async function AdminKebelesPage() {
  const [zones, woredas, kebeles, users, residentCountsByKebele] = await Promise.all([
    db.zone.findMany(),
    db.woreda.findMany(),
    db.kebele.findMany({ orderBy: [{ zoneId: "asc" }, { woredaId: "asc" }, { code: "asc" }] }),
    db.user.findMany(),
    db.resident.groupBy({
      by: ["kebeleId"],
      _count: { _all: true },
    }),
  ])

  type ResidentCountByKebele = { kebeleId: string; _count: { _all: number } }

  const kebelePopulationMap = new Map<string, number>(
    (residentCountsByKebele as ResidentCountByKebele[]).map((resident) => [
      resident.kebeleId,
      resident._count._all,
    ]),
  )

  const kebeleRows = kebeles.map((kebele) => {
    const woreda = woredas.find((item) => item.id === kebele.woredaId)
    const zone = zones.find((item) => item.id === kebele.zoneId || item.id === woreda?.zoneId)
    const kebeleAdmins = users.filter((user) => user.role === "kebele_admin" && user.scopeKebeleId === kebele.id)
    const population = kebelePopulationMap.get(kebele.id) ?? 0

    return {
      kebele,
      woreda,
      zone,
      kebeleAdmins,
      population,
    }
  })

  const highestHouseholdKebele = [...kebeleRows].sort(
    (left, right) => (right.kebele.householdCount ?? 0) - (left.kebele.householdCount ?? 0),
  )[0]

  const kebeleTableRows = kebeleRows.map((row) => ({
    kebele: {
      id: row.kebele.id,
      name: row.kebele.name,
      code: row.kebele.code,
      updatedAt: row.kebele.updatedAt.toISOString(),
      householdCount: row.kebele.householdCount ?? 0,
    },
    woredaName: row.woreda?.name ?? null,
    zoneName: row.zone?.name ?? null,
    kebeleAdminsCount: row.kebeleAdmins.length,
    population: row.population,
  }))

  return (
    <PageShell
      title="Kebele Administration"
      description="Improve local geography oversight with better hierarchy context, population signals, and household coverage."
      actions={<GeographyCreatePanel mode="kebele" />}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.06)_100%)] p-5 shadow-[0_18px_60px_-40px_hsl(var(--foreground)/0.45)] md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                  Local Coverage
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Kebele coverage board</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Review the lowest-level geography with clearer parent hierarchy, household footprint, and admin presence.
                  </p>
                </div>
              </div>
              <div className="rounded-none border border-border/70 bg-background/75 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Highest household footprint</p>
                <p className="mt-1 text-lg font-semibold">{highestHouseholdKebele?.kebele.name ?? "No kebeles yet"}</p>
                <p className="text-sm text-muted-foreground">
                  {(highestHouseholdKebele?.kebele.householdCount ?? 0).toLocaleString()} households
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border border-border/70 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Kebeles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{kebeles.length}</p>
              </div>
              <div className="rounded-none border border-sky-300/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">Linked Woredas</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sky-900">
                  {new Set(kebeles.map((kebele) => kebele.woredaId)).size}
                </p>
              </div>
              <div className="rounded-none border border-emerald-300/70 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Households</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">
                  {kebeles.reduce((sum, kebele) => sum + (kebele.householdCount ?? 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-none border border-amber-300/70 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Kebele Admins</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-amber-900">
                  {users.filter((user) => user.role === "kebele_admin").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <WorkspaceCard title="Field Signals" description="What needs attention at kebele level">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <MapPinned className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Average population</span>
              </div>
              <span className="text-sm font-semibold">
                {kebeles.length === 0 ? "0" : Math.round(kebeleRows.reduce((sum, row) => sum + row.population, 0) / kebeles.length).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-emerald-700" />
                <span className="text-sm font-medium">Average households</span>
              </div>
              <span className="text-sm font-semibold">
                {kebeles.length === 0
                  ? "0"
                  : Math.round(kebeles.reduce((sum, kebele) => sum + (kebele.householdCount ?? 0), 0) / kebeles.length).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-sky-700" />
                <span className="text-sm font-medium">Hierarchy complete</span>
              </div>
              <span className="text-sm font-semibold">
                {kebeleRows.filter((row) => row.zone && row.woreda).length}/{kebeles.length || 0} connected
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Users2 className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium">Admin coverage</span>
              </div>
              <span className="text-sm font-semibold">
                {kebeleRows.filter((row) => row.kebeleAdmins.length > 0).length}/{kebeles.length || 0} staffed
              </span>
            </div>
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="All Kebeles" description="Lowest-level geography with parent chain, population, and household footprint">
        <KebelesTable rows={kebeleTableRows} />
      </WorkspaceCard>
    </PageShell>
  )
}
