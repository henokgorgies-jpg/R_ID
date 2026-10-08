import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { db } from "@/lib/db";
import { CalendarDays, CheckCircle2, Users } from "lucide-react";
import { LifeEventsConsole } from "@/components/life-events/life-events-console";

export default async function LifeEventsPage() {
  const events = await db.lifeEvent.findMany({
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          grandFatherName: true,
        },
      },
      registeredByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      verifiedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { eventDate: "desc" },
  });

  const serializedEvents = events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    eventDate: event.eventDate.toISOString(),
    data: event.data,
    notes: event.notes,
    documentRefs: event.documentRefs,
    relatedResidentIds: event.relatedResidentIds,
    registeredAt: event.registeredAt.toISOString(),
    verifiedAt: event.verifiedAt ? event.verifiedAt.toISOString() : null,
    resident: event.resident,
    registeredByUser: event.registeredByUser,
    verifiedByUser: event.verifiedByUser,
  }));

  const verifiedCount = serializedEvents.filter((event) => event.verifiedAt).length;
  const unverifiedCount = serializedEvents.length - verifiedCount;
  const residentCount = new Set(serializedEvents.map((event) => event.resident.id)).size;

  return (
    <PageShell title="Life Events" hideHeader>
      <OpsPageIntro
        eyebrow="Civil Events"
        title="Life event registry and continuity log"
        description="Maintain time-sequenced civil events for each resident to keep household, status, and identity records synchronized."
        links={[
          { label: "Residents", href: "/residents", icon: Users },
          { label: "Life Events", href: "/life-events", icon: CalendarDays },
          { label: "Reports", href: "/reports", icon: CheckCircle2 },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Total Events" description="All recorded life events">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{serializedEvents.length.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Verified" description="Events validated by officers">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-emerald-700">{verifiedCount.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Pending Verification" description="Requires review">
          <p className="text-3xl font-semibold tracking-[-0.02em] text-amber-700">{unverifiedCount.toLocaleString()}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Residents Affected" description="Unique residents involved">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{residentCount.toLocaleString()}</p>
        </WorkspaceCard>
      </div>

      <LifeEventsConsole initialEvents={serializedEvents} />
    </PageShell>
  );
}

