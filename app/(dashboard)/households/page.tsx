import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { db } from "@/lib/db";
import { Home, Users, CheckCircle2 } from "lucide-react";
import { HouseholdsConsole } from "@/components/households/households-console";

export default async function HouseholdsPage() {
  const households = await db.household.findMany({
    include: {
      kebele: { select: { id: true, name: true } },
      woreda: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true } },
      residents: {
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandFatherName: true,
          gender: true,
          status: true,
          householdRole: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedHouseholds = households.map((household) => ({
    id: household.id,
    headResidentId: household.headResidentId,
    memberCount: household.memberCount,
    status: household.status,
    createdAt: household.createdAt.toISOString(),
    kebele: household.kebele,
    woreda: household.woreda,
    zone: household.zone,
    residents: household.residents,
  }));

  const activeCount = serializedHouseholds.filter((h) => h.status === "active").length;
  const inactiveCount = serializedHouseholds.filter((h) => h.status === "inactive").length;
  const relocatedCount = serializedHouseholds.filter((h) => h.status === "relocated").length;
  const totalMembers = serializedHouseholds.reduce((sum, household) => sum + household.memberCount, 0);

  return (
    <PageShell title="Households" hideHeader>
      <OpsPageIntro
        eyebrow="Household Registry"
        title="Household structure and membership operations"
        description="Track household composition, location context, and status lifecycle across kebeles."
        links={[
          { label: "Households", href: "/households", icon: Home },
          { label: "Residents", href: "/residents", icon: Users },
          { label: "Life Events", href: "/life-events", icon: CheckCircle2 },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Total Households" description="All registered households">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{serializedHouseholds.length.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Active" description="Operational households">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-emerald-700">{activeCount.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Inactive/Relocated" description="Non-active household records">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-amber-700">{(inactiveCount + relocatedCount).toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Total Members" description="Residents linked to households">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{totalMembers.toLocaleString()}</p>
        </WorkspaceCard>
      </div>

      <HouseholdsConsole initialHouseholds={serializedHouseholds} />
    </PageShell>
  );
}

