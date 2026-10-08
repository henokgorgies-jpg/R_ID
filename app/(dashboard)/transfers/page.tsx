import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { ArrowLeftRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { TransfersConsole } from "@/components/transfers/transfers-console";

export default async function TransfersPage() {
  const transfers = await db.transfer.findMany({
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandFatherName: true,
          idNumber: true,
        },
      },
      sourceKebele: { select: { id: true, name: true } },
      destinationKebele: { select: { id: true, name: true } },
      initiatedByUser: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedTransfers = transfers.map((transfer) => ({
    id: transfer.id,
    residentId: transfer.residentId,
    resident: transfer.resident,
    sourceKebele: transfer.sourceKebele,
    destinationKebele: transfer.destinationKebele,
    transferType: transfer.transferType,
    status: transfer.status,
    reason: transfer.reason,
    rejectionReason: transfer.rejectionReason,
    initiatedAt: transfer.initiatedAt.toISOString(),
    initiatedByUser: transfer.initiatedByUser,
    requiresNewId: transfer.requiresNewId,
    newIdNumber: transfer.newIdNumber,
  }));

  const pendingCount = serializedTransfers.filter((t) => t.status === "draft" || t.status === "submitted" || t.status === "pending_destination").length;
  const approvedCount = serializedTransfers.filter((t) => t.status === "approved").length;
  const completedCount = serializedTransfers.filter((t) => t.status === "completed").length;
  const rejectedCount = serializedTransfers.filter((t) => t.status === "rejected").length;

  return (
    <PageShell title="Transfers" hideHeader>
      <OpsPageIntro
        eyebrow="Transfer Workflow"
        title="Cross-boundary transfer operations"
        description="Track movement requests between kebeles, review source and destination context, and monitor approval status across each transfer stage."
        links={[
          { label: "Transfers", href: "/transfers", icon: ArrowLeftRight },
          { label: "Verification", href: "/verification", icon: ShieldCheck },
          { label: "Completed", href: "/transfers", icon: CheckCircle2 },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Total Transfers" description="All transfer requests">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{serializedTransfers.length.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Pending" description="Submitted and awaiting destination">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-amber-700">{pendingCount.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Approved/Completed" description="Processed workflow outcomes">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-emerald-700">{(approvedCount + completedCount).toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Rejected" description="Denied transfer requests">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-rose-700">{rejectedCount.toLocaleString()}</p>
        </WorkspaceCard>
      </div>

      <TransfersConsole initialTransfers={serializedTransfers} />
    </PageShell>
  );
}
