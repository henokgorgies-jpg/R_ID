import { Building2, MapPinned, Network, Users2 } from "lucide-react"
import { GeographyCreatePanel } from "@/components/admin/geography-create-panel"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/db"

export default async function AdminZonesPage() {
  const [zones, woredas, kebeles, users, residentCountsByZone] = await Promise.all([
    db.zone.findMany({ orderBy: { code: "asc" } }),
    db.woreda.findMany(),
    db.kebele.findMany(),
    db.user.findMany(),
    db.resident.groupBy({
      by: ["zoneId"],
      _count: { _all: true },
    }),
  ])

  const zonePopulationMap = new Map<string, number>(
    residentCountsByZone.map((resident) => [resident.zoneId, resident._count._all]),
  )

  const zoneRows = zones.map((zone) => {
    const zoneWoredas = woredas.filter((woreda) => woreda.zoneId === zone.id)
    const zoneKebeles = kebeles.filter((kebele) => kebele.zoneId === zone.id)
    const zoneAdmins = users.filter((user) => user.role === "zone_admin" && user.scopeZoneId === zone.id)
    const population = zonePopulationMap.get(zone.id) ?? 0

    return {
      zone,
      zoneWoredas,
      zoneKebeles,
      zoneAdmins,
      population,
    }
  })

  const mostPopulatedZone = [...zoneRows].sort((left, right) => right.population - left.population)[0]

  return (
    <PageShell
      title="Zone Administration"
      description="Manage city zones with clearer hierarchy, coverage, and staffing signals."
      actions={<GeographyCreatePanel mode="zone" />}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.06)_100%)] p-5 shadow-[0_18px_60px_-40px_hsl(var(--foreground)/0.45)] md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                  Geography Control
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Zone network overview</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Track which zones are carrying the highest population and how their subordinate woredas and kebeles are distributed.
                  </p>
                </div>
              </div>
              <div className="rounded-none border border-border/70 bg-background/75 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Most populated zone</p>
                <p className="mt-1 text-lg font-semibold">{mostPopulatedZone?.zone.name ?? "No zones yet"}</p>
                <p className="text-sm text-muted-foreground">{(mostPopulatedZone?.population ?? 0).toLocaleString()} residents</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border border-border/70 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Zones</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{zones.length}</p>
              </div>
              <div className="rounded-none border border-sky-300/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">Woredas</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sky-900">{woredas.length}</p>
              </div>
              <div className="rounded-none border border-emerald-300/70 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Kebeles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">{kebeles.length}</p>
              </div>
              <div className="rounded-none border border-amber-300/70 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Zone Admins</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-amber-900">
                  {users.filter((user) => user.role === "zone_admin").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <WorkspaceCard title="Coverage Signals" description="Fast operational read for zone administration">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <MapPinned className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Average population</span>
              </div>
              <span className="text-sm font-semibold">
                {zones.length === 0 ? "0" : Math.round(zoneRows.reduce((sum, row) => sum + row.population, 0) / zones.length).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-sky-700" />
                <span className="text-sm font-medium">Average woredas / zone</span>
              </div>
              <span className="text-sm font-semibold">
                {zones.length === 0 ? "0" : (woredas.length / zones.length).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Network className="h-4 w-4 text-emerald-700" />
                <span className="text-sm font-medium">Average kebeles / zone</span>
              </div>
              <span className="text-sm font-semibold">
                {zones.length === 0 ? "0" : (kebeles.length / zones.length).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/60 bg-background/70 px-3 py-3">
              <div className="flex items-center gap-3">
                <Users2 className="h-4 w-4 text-amber-700" />
                <span className="text-sm font-medium">Admin coverage</span>
              </div>
              <span className="text-sm font-semibold">
                {zoneRows.filter((row) => row.zoneAdmins.length > 0).length}/{zones.length || 0} zones staffed
              </span>
            </div>
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="All Zones" description="Zone-level hierarchy, population, and staffing coverage">
        <div className="overflow-x-auto rounded-none border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Zone</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Population</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zoneRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No zone records available yet.
                  </TableCell>
                </TableRow>
              ) : (
                zoneRows.map((row) => (
                  <TableRow key={row.zone.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(row.zone.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{row.zone.code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{row.zoneWoredas.length} woredas</p>
                        <p className="text-xs text-muted-foreground">{row.zoneKebeles.length} kebeles linked</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{row.population.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{row.zoneAdmins.length} zone admins</p>
                        <p className="text-xs text-muted-foreground">
                          {row.zoneAdmins.length > 0 ? "Assigned" : "Needs staffing"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          row.zoneAdmins.length > 0
                            ? "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
                            : "rounded-none border border-amber-300/80 bg-amber-50 text-amber-800"
                        }
                      >
                        {row.zoneAdmins.length > 0 ? "Covered" : "Needs Admin"}
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
