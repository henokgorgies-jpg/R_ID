"use client"

import { useMemo, useState } from "react"
import {
  Clock3,
  Database,
  Filter,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { WorkspaceCard } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AuditLogConsoleRow = {
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
  timestamp: string
  zoneName: string | null
  woredaName: string | null
  kebeleName: string | null
}

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function actionBadgeClass(action: string) {
  switch (action) {
    case "create":
      return "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
    case "update":
      return "rounded-none border border-sky-300/80 bg-sky-50 text-sky-800"
    case "delete":
    case "reject":
      return "rounded-none border border-rose-300/80 bg-rose-50 text-rose-800"
    case "approve":
    case "verify_id":
      return "rounded-none border border-cyan-300/80 bg-cyan-50 text-cyan-800"
    case "payment":
      return "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
    case "transfer":
    case "merge":
      return "rounded-none border border-violet-300/80 bg-violet-50 text-violet-800"
    case "login":
    case "logout":
      return "rounded-none border border-amber-300/80 bg-amber-50 text-amber-800"
    default:
      return "rounded-none border border-zinc-300/80 bg-zinc-100 text-zinc-800"
  }
}

function formatJson(value: unknown) {
  if (value == null) return "No payload recorded"
  return JSON.stringify(value, null, 2)
}

function buildPageHref(page: number) {
  return page <= 1 ? "/audit-logs" : `/audit-logs?page=${page}`
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  if (currentPage <= 4) return [1, 2, 3, 4, 5, -1, totalPages]
  if (currentPage >= totalPages - 3) return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages]
}

export function AuditLogConsole({
  rows,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
}: {
  rows: AuditLogConsoleRow[]
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [resourceFilter, setResourceFilter] = useState("all")

  const actionOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.action))).sort(), [rows])
  const resourceOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.resourceType))).sort(), [rows])
  const userOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.userEmail)))
        .sort()
        .map((email) => ({
          email,
          count: rows.filter((row) => row.userEmail === email).length,
        })),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase()

    return rows.filter((row) => {
      const matchesSearch =
        row.userEmail.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.action.toLowerCase().includes(query) ||
        row.resourceType.toLowerCase().includes(query) ||
        (row.resourceId ?? "").toLowerCase().includes(query)

      const matchesUser = userFilter === "all" || row.userEmail === userFilter
      const matchesAction = actionFilter === "all" || row.action === actionFilter
      const matchesResource = resourceFilter === "all" || row.resourceType === resourceFilter

      return matchesSearch && matchesUser && matchesAction && matchesResource
    })
  }, [rows, searchQuery, userFilter, actionFilter, resourceFilter])

  const busiestUser = userOptions[0]
  const uniqueUsers = userOptions.length
  const actionCount = filteredRows.length
  const approvalEvents = filteredRows.filter((row) => ["approve", "reject", "verify_id"].includes(row.action)).length
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)
  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.06)_100%)] p-5 shadow-[0_18px_60px_-40px_hsl(var(--foreground)/0.45)] md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                  Traceability
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Every recorded user action in one timeline</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Filter by actor, action, and resource type to inspect what happened, when it happened, and what changed.
                  </p>
                </div>
              </div>
              <div className="rounded-none border border-border/70 bg-background/75 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Most active user</p>
                <p className="mt-1 text-sm font-semibold">{busiestUser?.email ?? "No logs yet"}</p>
                <p className="text-xs text-muted-foreground">{busiestUser?.count ?? 0} actions recorded</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border border-border/70 bg-background/75 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Visible Events</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{actionCount}</p>
              </div>
              <div className="rounded-none border border-sky-300/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">Unique Users</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sky-900">{uniqueUsers}</p>
              </div>
              <div className="rounded-none border border-emerald-300/70 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Action Types</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">{actionOptions.length}</p>
              </div>
              <div className="rounded-none border border-amber-300/70 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Review Actions</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-amber-900">{approvalEvents}</p>
              </div>
            </div>
          </div>
        </div>

        <WorkspaceCard title="User Focus" description="Quick filters for actor-driven review">
          <div className="space-y-3">
            {userOptions.slice(0, 6).map((user) => (
              <Button
                key={user.email}
                type="button"
                variant="outline"
                className={`h-auto w-full justify-between rounded-none px-3 py-3 ${
                  userFilter === user.email ? "border-primary bg-primary/5 text-primary" : ""
                }`}
                onClick={() => setUserFilter((current) => (current === user.email ? "all" : user.email))}
              >
                <span className="truncate text-left text-sm">{user.email}</span>
                <Badge variant="outline" className="rounded-none">{user.count}</Badge>
              </Button>
            ))}
            {userOptions.length === 0 ? (
              <div className="rounded-none border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No audit activity available yet.
              </div>
            ) : null}
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard
        title="Audit Timeline"
        description="Search and inspect every stored action record"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-none">
              {filteredRows.length} visible on this page
            </Badge>
            <Badge variant="outline" className="rounded-none">
              {pageStart}-{pageEnd} of {totalCount}
            </Badge>
          </div>
        }
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-none pl-9"
              placeholder="Search user, action, resource, description, or ID"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {userOptions.map((user) => (
                <SelectItem key={user.email} value={user.email}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action}>
                  {labelize(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Filter by resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {resourceOptions.map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {labelize(resource)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 ? (
            <div className="rounded-none border border-dashed border-border/70 bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
              No audit entries match the current filters.
            </div>
          ) : (
            filteredRows.map((row) => (
              <details key={row.id} className="group rounded-none border border-border/70 bg-background/80 open:shadow-[0_18px_30px_-28px_hsl(var(--foreground)/0.45)]">
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-border/70 bg-muted/20">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={actionBadgeClass(row.action)} variant="secondary">
                          {labelize(row.action)}
                        </Badge>
                        <Badge variant="outline" className="rounded-none">
                          {labelize(row.resourceType)}
                        </Badge>
                        {row.resourceId ? (
                          <Badge variant="outline" className="rounded-none text-muted-foreground">
                            {row.resourceId}
                          </Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{row.description}</p>
                        <p className="truncate text-sm text-muted-foreground">{row.userEmail}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          {labelize(row.userRole)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {new Date(row.timestamp).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5" />
                          {row.zoneName ?? row.woredaName ?? row.kebeleName ?? "System scope"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    <Filter className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    Details
                  </div>
                </summary>

                <div className="border-t border-border/70 px-4 py-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-3">
                      <div className="rounded-none border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Event Metadata</p>
                        <div className="mt-3 grid gap-2 text-sm">
                          <p><span className="text-muted-foreground">User:</span> {row.userEmail}</p>
                          <p><span className="text-muted-foreground">Role:</span> {labelize(row.userRole)}</p>
                          <p><span className="text-muted-foreground">Action:</span> {labelize(row.action)}</p>
                          <p><span className="text-muted-foreground">Resource:</span> {labelize(row.resourceType)}</p>
                          <p><span className="text-muted-foreground">Resource ID:</span> {row.resourceId ?? "Not recorded"}</p>
                          <p><span className="text-muted-foreground">IP Address:</span> {row.ipAddress ?? "Not recorded"}</p>
                          <p><span className="text-muted-foreground">Zone:</span> {row.zoneName ?? row.zoneId ?? "N/A"}</p>
                          <p><span className="text-muted-foreground">Woreda:</span> {row.woredaName ?? row.woredaId ?? "N/A"}</p>
                          <p><span className="text-muted-foreground">Kebele:</span> {row.kebeleName ?? row.kebeleId ?? "N/A"}</p>
                        </div>
                      </div>
                      <div className="rounded-none border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">User Agent</p>
                        <p className="mt-2 break-all text-sm text-muted-foreground">
                          {row.userAgent ?? "No user agent recorded"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-none border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Previous Value</p>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-none bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                          {formatJson(row.previousValue)}
                        </pre>
                      </div>
                      <div className="rounded-none border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">New Value</p>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-none bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                          {formatJson(row.newValue)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-6 border-t border-border/70 pt-4">
            <div className="mb-3 flex flex-col gap-1 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <p>Showing {pageStart}-{pageEnd} of {totalCount} audit entries.</p>
              <p>Page {currentPage} of {totalPages}</p>
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={buildPageHref(currentPage - 1)}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>

                {visiblePages.map((pageNumber, index) => (
                  <PaginationItem key={`${pageNumber}-${index}`}>
                    {pageNumber === -1 ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink href={buildPageHref(pageNumber)} isActive={pageNumber === currentPage}>
                        {pageNumber}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href={buildPageHref(currentPage + 1)}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </WorkspaceCard>
    </div>
  )
}
