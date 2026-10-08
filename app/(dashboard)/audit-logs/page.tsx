import { PageShell } from "@/components/layout/page-shell"
import { AuditLogConsole } from "@/components/audit/audit-log-console"
import { db } from "@/lib/db"

const PAGE_SIZE = 20

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(raw ?? "", 10)
  if (!Number.isFinite(page) || page <= 0) return 1
  return page
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const currentPage = parsePage(resolvedSearchParams?.page)
  const skip = (currentPage - 1) * PAGE_SIZE

  const fetchAuditRows = async (offset: number) =>
    db.$queryRaw<
      Array<{
        id: string
        userId: string
        userEmail: string
        userRole: string
        action: string
        resourceType: string
        resourceId: string | null
        previousValue: unknown
        newValue: unknown
        description: string
        ipAddress: string | null
        userAgent: string | null
        zoneId: string | null
        woredaId: string | null
        kebeleId: string | null
        timestamp: Date | string
        zoneName: string | null
        woredaName: string | null
        kebeleName: string | null
      }>
    >`
      SELECT
        a.id,
        a."userId",
        a."userEmail",
        a."userRole"::text AS "userRole",
        a.action::text AS action,
        a."resourceType"::text AS "resourceType",
        a."resourceId",
        a."previousValue",
        a."newValue",
        a.description,
        a."ipAddress",
        a."userAgent",
        a."zoneId",
        a."woredaId",
        a."kebeleId",
        a.timestamp,
        z.name AS "zoneName",
        w.name AS "woredaName",
        k.name AS "kebeleName"
      FROM "AuditLog" a
      LEFT JOIN "Zone" z ON z.id = a."zoneId"
      LEFT JOIN "Woreda" w ON w.id = a."woredaId"
      LEFT JOIN "Kebele" k ON k.id = a."kebeleId"
      ORDER BY a.timestamp DESC
      OFFSET ${offset}
      LIMIT ${PAGE_SIZE}
    `

  const [countRows, logs] = await Promise.all([
    db.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*)::bigint AS count FROM "AuditLog"`,
    fetchAuditRows(skip),
  ])
  const totalCount = Number(countRows[0]?.count ?? 0)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const effectiveLogs =
    safeCurrentPage === currentPage
      ? logs
      : await fetchAuditRows((safeCurrentPage - 1) * PAGE_SIZE)

  const serializedLogs = effectiveLogs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    userRole: log.userRole,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    previousValue: log.previousValue,
    newValue: log.newValue,
    description: log.description,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    zoneId: log.zoneId,
    woredaId: log.woredaId,
    kebeleId: log.kebeleId,
    timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString(),
    zoneName: log.zoneName ?? null,
    woredaName: log.woredaName ?? null,
    kebeleName: log.kebeleName ?? null,
  }))

  return (
    <PageShell
      title="Audit Logs"
      description="Inspect every recorded user action with scope, payload changes, and timeline context."
    >
      <AuditLogConsole
        rows={serializedLogs}
        currentPage={safeCurrentPage}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </PageShell>
  )
}
