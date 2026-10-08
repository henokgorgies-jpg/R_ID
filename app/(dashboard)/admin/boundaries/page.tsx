import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/db"

export default async function AdminBoundariesPage() {
  const [zones, woredas, kebeles] = await Promise.all([
    db.zone.findMany({ orderBy: { code: "asc" } }),
    db.woreda.findMany({ orderBy: [{ zoneId: "asc" }, { code: "asc" }] }),
    db.kebele.findMany({ orderBy: [{ woredaId: "asc" }, { code: "asc" }] }),
  ])

  return (
    <PageShell title="Administrative Boundaries" description="Zones, woredas, and kebeles hierarchy">
      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceCard title="Zones" description="Administrative zones">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{zones.length}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Woredas" description="District divisions">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{woredas.length}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Kebeles" description="Neighborhood units">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{kebeles.length}</p>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="Boundary Matrix" description="Flattened hierarchy overview">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead>Woreda</TableHead>
              <TableHead>Kebele</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Population</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kebeles.map((k: any) => {
              const woreda = woredas.find((w: any) => w.id === k.woredaId)
              const zone = zones.find((z: any) => z.id === k.zoneId)
              return (
                <TableRow key={k.id}>
                  <TableCell>{zone?.name ?? "-"}</TableCell>
                  <TableCell>{woreda?.name ?? "-"}</TableCell>
                  <TableCell>{k.name}</TableCell>
                  <TableCell className="font-mono">{k.code}</TableCell>
                  <TableCell>{k.population.toLocaleString()}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </WorkspaceCard>
    </PageShell>
  )
}
