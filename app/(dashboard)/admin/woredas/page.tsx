import { Building2, Landmark, MapPinned, Users2 } from "lucide-react"
import { GeographyCreatePanel } from "@/components/admin/geography-create-panel"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/db"

export default async function AdminWoredasPage() {
  const [zones, woredas, kebeles, users, residentCountsByWoreda] = await Promise.all([
    db.zone.findMany(),
    db.woreda.findMany({ orderBy: [{ zoneId: "asc" }, { code: "asc" }] }),
    db.kebele.findMany(),
    db.user.findMany(),
    db.resident.groupBy({
      by: ["woredaId"],
      _count: { _all: true },
    }),
  ])

  const woredaPopulationMap = new Map<string, number>(
    residentCountsByWoreda.map((resident) => [resident.woredaId, resident._count._all]),
  )

  const woredaRows = woredas.map((woreda) => {
    const zone = zones.find((item) => item.id === woreda.zoneId)
    const woredaKebeles = kebeles.filter((kebele) => kebele.woredaId === woreda.id)
    const woredaAdmins = users.filter((user) => user.role === "woreda_admin" && user.scopeWoredaId === woreda.id)
    const population = woredaPopulationMap.get(woreda.id) ?? 0

    return {
      woreda,
      zone,
      woredaKebeles,
      woredaAdmins,
      population,
    }
  })

  const mostConnectedWoreda = [...woredaRows].sort((left, right) => right.woredaKebeles.length - left.woredaKebeles.length)[0]

  return (
    <PageShell
      title="Woreda Administration"
      description="Refresh woreda operations with clearer zone alignment, kebele distribution, and staffing readiness."
      actions={<GeographyCreatePanel mode="woreda" />}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.06)_100%)] p-5 shadow-[0_18px_60px_-40px_hsl(var(--foreground)/0.45)] md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                  Mid-Level Geography
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Woreda alignment board</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Review each woreda in relation to its parent zone, linked kebeles, and assigned operations staff.
                  </p>
                </div>
              </div>
              <div className="rounded-none border border-border/70 bg-background/75 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Most connected woreda</p>
                <p className="mt-1 text-lg font-semibold">{mostConnectedWoreda?.woreda.name ?? "No woredas yet"}</p>
                <p className="text-sm text-muted-foreground">{mostConnectedWoreda?.woredaKebeles.length ?? 0} kebeles linked</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border border-border/70 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Woredas</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{woredas.length}</p>
              </div>
              <div className="rounded-none border border-sky-300/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">Zones Covered</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sky-900">
                  {new Set(woredas.map((woreda) => woreda.zoneId)).size}
                </p>
              </div>
              <div className="rounded-none border border-emerald-300/70 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Linked Kebeles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">{kebeles.length}</p>
              </div>
              <div className="rounded-none border border-amber-300/70 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Woreda Admins</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-amber-900">
                  {users.filter((user) => user.role === "woreda_admin").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <WorkspaceCard title="Operations Signals" description="Fast-read metrics for woreda readiness">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Average population</span>
              </div>
              <span className="text-sm font-semibold">
                {woredas.length === 0 ? "0" : Math.round(woredaRows.reduce((sum, row) => sum + row.population, 0) / woredas.length).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-sky-700" />
                <span className="text-sm font-medium">Average kebeles / woreda</span>
              </div>
              <span className="text-sm font-semibold">
                {woredas.length === 0 ? "0" : (kebeles.length / woredas.length).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <MapPinned className="h-4 w-4 text-emerald-700" />
                <span className="text-sm font-medium">Zone-linked</span>
              </div>
              <span className="text-sm font-semibold">
                {woredaRows.filter((row) => row.zone).length}/{woredas.length || 0} connected
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Users2 className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium">Staff coverage</span>
              </div>
              <span className="text-sm font-semibold">
                {woredaRows.filter((row) => row.woredaAdmins.length > 0).length}/{woredas.length || 0} staffed
              </span>
            </div>
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="All Woredas" description="Zone relation, kebele count, population, and local staffing">
        <div className="overflow-x-auto rounded-none border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Woreda</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Parent Zone</TableHead>
                <TableHead>Kebele Coverage</TableHead>
                <TableHead>Population</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {woredaRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    No woreda records available yet.
                  </TableCell>
                </TableRow>
              ) : (
                woredaRows.map((row) => (
                  <TableRow key={row.woreda.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.woreda.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(row.woreda.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.woreda.code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{row.zone?.name ?? "Unassigned Zone"}</p>
                        <p className="text-xs text-muted-foreground">{row.zone ? "Hierarchy intact" : "Needs repair"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{row.woredaKebeles.length} kebeles</p>
                        <p className="text-xs text-muted-foreground">
                          {row.woredaKebeles.length > 0 ? "Locally distributed" : "No kebeles linked"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{row.population.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{row.woredaAdmins.length} woreda admins</p>
                        <p className="text-xs text-muted-foreground">
                          {row.woredaAdmins.length > 0 ? "Assigned" : "Needs staffing"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          row.woredaAdmins.length > 0 && row.zone
                            ? "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
                            : "rounded-none border border-amber-300/80 bg-amber-50 text-amber-800"
                        }
                      >
                        {row.woredaAdmins.length > 0 && row.zone ? "Operational" : "Needs Attention"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>
    </PageShell>
  )
}
