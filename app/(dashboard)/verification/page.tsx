import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, SearchCheck, ShieldCheck } from "lucide-react"
import { db } from "@/lib/db"

export default async function VerificationPage() {
  const requests = await db.transfer.findMany({
    where: { status: { in: ["submitted", "pending_destination"] } },
    include: { resident: true },
    orderBy: { initiatedAt: "desc" },
  })

  return (
    <PageShell title="Verification" hideHeader>
      <OpsPageIntro
        eyebrow="Verification Pipeline"
        title="Pending verification checkpoints"
        description="Review requests waiting for approval and validate transfer context before progression to destination workflow."
        links={[
          { label: "Verification", href: "/verification", icon: SearchCheck },
          { label: "Transfers", href: "/transfers", icon: ArrowLeftRight },
          { label: "Approved", href: "/verification", icon: ShieldCheck },
        ]}
      />
      <WorkspaceCard title="Pending Requests" description={`${requests.length} requests`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Resident</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.resident.firstName} {r.resident.fatherName} {r.resident.grandFatherName}</TableCell>
                <TableCell>{r.reason}</TableCell>
                <TableCell>{r.transferType}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell>{r.initiatedAt.toISOString().slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceCard>
    </PageShell>
  )
}
