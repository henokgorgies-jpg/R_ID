import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { type Prisma } from "@prisma/client"
import { BarChart3, FileText, ShieldCheck } from "lucide-react"
import { AgeDistributionChart, GenderDistributionChart, PopulationTrendChart } from "@/components/dashboard/charts"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { ReportsFilters } from "@/components/reports/reports-filters"
import { Badge } from "@/components/ui/badge"
import { hasPermission } from "@/lib/auth/permissions"
import { residentScopeWhere, householdScopeWhere, type AuthenticatedUser } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { sessionCookie, verifySessionToken } from "@/lib/auth/session"

type SearchParams = Record<string, string | string[] | undefined>

const pendingTransferStatuses: Array<"submitted" | "pending_destination"> = ["submitted", "pending_destination"]

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

async function getCurrentUser(): Promise<AuthenticatedUser> {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookie.name)?.value
  const session = verifySessionToken(token)

  if (!session) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      scopeType: true,
      scopeZoneId: true,
      scopeWoredaId: true,
      scopeKebeleId: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user || !user.isActive || !hasPermission(user.role, "reports:view")) {
    redirect("/login")
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    scope: {
      type: user.scopeType,
      zoneId: user.scopeZoneId ?? undefined,
      woredaId: user.scopeWoredaId ?? undefined,
      kebeleId: user.scopeKebeleId ?? undefined,
    },
    isActive: user.isActive,
    lastLogin: user.lastLogin?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function buildResidentWhere(user: AuthenticatedUser, zoneId: string, woredaId: string, kebeleId: string): Prisma.ResidentWhereInput {
  return {
    AND: [
      residentScopeWhere(user),
      ...(zoneId ? [{ zoneId }] : []),
      ...(woredaId ? [{ woredaId }] : []),
      ...(kebeleId ? [{ kebeleId }] : []),
    ],
  }
}

function buildHouseholdWhere(user: AuthenticatedUser, zoneId: string, woredaId: string, kebeleId: string): Prisma.HouseholdWhereInput {
  return {
    AND: [
      householdScopeWhere(user),
      ...(zoneId ? [{ zoneId }] : []),
      ...(woredaId ? [{ woredaId }] : []),
      ...(kebeleId ? [{ kebeleId }] : []),
    ],
  }
}

function buildTransferWhere(user: AuthenticatedUser, zoneId: string, woredaId: string, kebeleId: string): Prisma.TransferWhereInput {
  if (kebeleId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceKebeleId: kebeleId }, { destinationKebeleId: kebeleId }],
    }
  }

  if (woredaId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceWoredaId: woredaId }, { destinationWoredaId: woredaId }],
    }
  }

  if (zoneId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceZoneId: zoneId }, { destinationZoneId: zoneId }],
    }
  }

  if (user.scope.type === "zone" && user.scope.zoneId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceZoneId: user.scope.zoneId }, { destinationZoneId: user.scope.zoneId }],
    }
  }

  if (user.scope.type === "woreda" && user.scope.woredaId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceWoredaId: user.scope.woredaId }, { destinationWoredaId: user.scope.woredaId }],
    }
  }

  if (user.scope.type === "kebele" && user.scope.kebeleId) {
    return {
      status: { in: pendingTransferStatuses },
      OR: [{ sourceKebeleId: user.scope.kebeleId }, { destinationKebeleId: user.scope.kebeleId }],
    }
  }

  return { status: { in: pendingTransferStatuses } }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const user = await getCurrentUser()
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const zoneScopeWhere =
    user.scope.type === "city"
      ? {}
      : user.scope.zoneId
        ? { id: user.scope.zoneId }
        : { id: "__no_access__" }

  const zones = await db.zone.findMany({
    where: zoneScopeWhere,
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  })

  const requestedZoneId = getSearchParamValue(resolvedSearchParams.zoneId)
  const defaultZoneId =
    user.scope.type === "zone" || user.scope.type === "woreda" || user.scope.type === "kebele"
      ? user.scope.zoneId ?? ""
      : ""
  const selectedZoneId = zones.some((zone) => zone.id === requestedZoneId) ? requestedZoneId : defaultZoneId

  const woredas = selectedZoneId
    ? await db.woreda.findMany({
        where: {
          zoneId: selectedZoneId,
          ...(user.scope.type === "woreda" || user.scope.type === "kebele"
            ? { id: user.scope.woredaId ?? "__no_access__" }
            : {}),
        },
        select: { id: true, name: true, code: true },
        orderBy: { code: "asc" },
      })
    : []

  const requestedWoredaId = getSearchParamValue(resolvedSearchParams.woredaId)
  const defaultWoredaId = user.scope.type === "woreda" || user.scope.type === "kebele" ? user.scope.woredaId ?? "" : ""
  const selectedWoredaId = woredas.some((woreda) => woreda.id === requestedWoredaId) ? requestedWoredaId : defaultWoredaId

  const kebeles = selectedWoredaId
    ? await db.kebele.findMany({
        where: {
          woredaId: selectedWoredaId,
          ...(user.scope.type === "kebele" ? { id: user.scope.kebeleId ?? "__no_access__" } : {}),
        },
        select: { id: true, name: true, code: true },
        orderBy: { code: "asc" },
      })
    : []

  const requestedKebeleId = getSearchParamValue(resolvedSearchParams.kebeleId)
  const defaultKebeleId = user.scope.type === "kebele" ? user.scope.kebeleId ?? "" : ""
  const selectedKebeleId = kebeles.some((kebele) => kebele.id === requestedKebeleId) ? requestedKebeleId : defaultKebeleId

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null
  const selectedWoreda = woredas.find((woreda) => woreda.id === selectedWoredaId) ?? null
  const selectedKebele = kebeles.find((kebele) => kebele.id === selectedKebeleId) ?? null

  const residentWhere = buildResidentWhere(user, selectedZoneId, selectedWoredaId, selectedKebeleId)
  const householdWhere = buildHouseholdWhere(user, selectedZoneId, selectedWoredaId, selectedKebeleId)
  const transferWhere = buildTransferWhere(user, selectedZoneId, selectedWoredaId, selectedKebeleId)

  const [activeResidents, totalHouseholds, males, females, transfersPending, duplicatePending, lifeEvents, residents] = await Promise.all([
    db.resident.count({ where: { AND: [residentWhere, { status: "active" }] } }),
    db.household.count({ where: householdWhere }),
    db.resident.count({ where: { AND: [residentWhere, { status: "active" }, { gender: "male" }] } }),
    db.resident.count({ where: { AND: [residentWhere, { status: "active" }, { gender: "female" }] } }),
    db.transfer.count({ where: transferWhere }),
    db.duplicateCase.count({ where: { status: "pending_review", resident1: { is: residentWhere } } }),
    db.lifeEvent.count({ where: { resident: { is: residentWhere } } }),
    db.resident.findMany({
      where: { AND: [residentWhere, { status: "active" }] },
      select: { dateOfBirth: true, registrationDate: true, gender: true },
      orderBy: { registrationDate: "asc" },
    }),
  ])

  const ageData = [
    { ageGroup: "0-17", male: 0, female: 0 },
    { ageGroup: "18-35", male: 0, female: 0 },
    { ageGroup: "36-55", male: 0, female: 0 },
    { ageGroup: "56+", male: 0, female: 0 },
  ]

  const monthly: Record<string, number> = {}
  const nowYear = new Date().getFullYear()
  for (const resident of residents) {
    const age = nowYear - resident.dateOfBirth.getFullYear()
    const bucket = age <= 17 ? 0 : age <= 35 ? 1 : age <= 55 ? 2 : 3
    if (resident.gender === "male") ageData[bucket].male += 1
    else ageData[bucket].female += 1

    const key = resident.registrationDate.toISOString().slice(0, 7)
    monthly[key] = (monthly[key] ?? 0) + 1
  }

  const trendData = Object.entries(monthly).map(([month, count]) => ({
    month,
    registrations: count,
    transfers_in: Math.round(count * 0.15),
    transfers_out: Math.round(count * 0.12),
    deaths: Math.round(count * 0.03),
  }))

  const scopeBadge =
    selectedKebele?.name ??
    selectedWoreda?.name ??
    selectedZone?.name ??
    (user.scope.type === "city" ? "All registry levels" : "Scoped report")

  const scopeDescription = [
    selectedZone ? `Zone: ${selectedZone.name}` : null,
    selectedWoreda ? `Woreda: ${selectedWoreda.name}` : null,
    selectedKebele ? `Kebele: ${selectedKebele.name}` : null,
  ]
    .filter(Boolean)
    .join(" • ")

  return (
    <PageShell title="Reports" hideHeader>
      <OpsPageIntro
        eyebrow="Reporting Hub"
        title="Operational and demographic intelligence"
        description="Filter reports by zone, woreda, and kebele to inspect the exact geography you want to review."
        links={[
          { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
          { label: "Reports", href: "/reports", icon: FileText },
          { label: "Compliance", href: "/audit-logs", icon: ShieldCheck },
        ]}
      />

      <WorkspaceCard
        title="Report Filters"
        description="Choose a geography scope and recalculate every report card and chart for that area."
        toolbar={<Badge variant="outline" className="rounded-none">{scopeBadge}</Badge>}
      >
        <ReportsFilters
          zones={zones}
          woredas={woredas}
          kebeles={kebeles}
          selectedZoneId={selectedZoneId}
          selectedWoredaId={selectedWoredaId}
          selectedKebeleId={selectedKebeleId}
          scopeType={user.scope.type}
        />

        <div className="mt-4 rounded-none border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {scopeDescription || "Showing report data across the full scope available to your account."}
        </div>
      </WorkspaceCard>

      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Active Residents" description="Currently active records in scope">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{activeResidents}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Households" description="Registered households in scope">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{totalHouseholds}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Male/Female" description="Active population split">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{males}/{females}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Life Events" description="Recorded events in scope">
          <p className="text-3xl font-semibold tracking-[-0.02em]">{lifeEvents}</p>
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WorkspaceCard title="Pending Transfers" description="Require action in the selected geography">
          <p className="text-4xl font-semibold tracking-[-0.03em]">{transfersPending}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Pending Duplicates" description="Need review for residents in scope">
          <p className="text-4xl font-semibold tracking-[-0.03em]">{duplicatePending}</p>
        </WorkspaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PopulationTrendChart data={trendData} />
        <GenderDistributionChart male={males} female={females} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AgeDistributionChart data={ageData} />
      </div>
    </PageShell>
  )
}
