"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, GitMerge, RefreshCcw, ShieldX } from "lucide-react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth/auth-context"
import { canAccess } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type DuplicateRow = {
  id: string
  overallScore: number
  scores: { faceScore?: number } | null
  priority: string
  status: string
  escalated?: boolean
  assignedTo?: string | null
  assignedAt?: string | null
  assignee?: { id: string; firstName: string; lastName: string } | null
  userStates?: { snoozedUntil?: string | null; snoozedAt?: string | null }[]
  detectedAt: string
  resident1: any
  resident2: any
}

type DecisionAction = "confirmed_duplicate" | "not_duplicate" | "merge"
type SortMode = "highest_score" | "newest" | "oldest"
type GroupMode = "by_case" | "by_person"
type PresetMode = "all" | "high_risk" | "today" | "needs_review"
type RiskLevel = "Critical" | "High" | "Medium" | "Low"

type ColumnDef = {
  key: string
  title: string
  tone: string
}

type CardUnit = {
  key: string
  lane: string
  primary: DuplicateRow
  cases: DuplicateRow[]
}

const COLUMNS: ColumnDef[] = [
  { key: "flagged", title: "Flagged", tone: "border-amber-300/60 bg-amber-50/40" },
  { key: "pending_review", title: "Pending Review", tone: "border-sky-300/60 bg-sky-50/40" },
  { key: "confirmed_duplicate", title: "Ready to Merge", tone: "border-orange-300/60 bg-orange-50/40" },
  { key: "merged", title: "Resolved", tone: "border-emerald-300/60 bg-emerald-50/40" },
]

const PAGE_SIZE = 20

function riskMeta(d: DuplicateRow): { label: RiskLevel; className: string } {
  const face = d.scores?.faceScore ?? 0
  if (face >= 90) return { label: "Critical", className: "border-red-300/70 bg-red-50 text-red-700" }
  if (face >= 80) return { label: "High", className: "border-orange-300/70 bg-orange-50 text-orange-700" }
  if (face >= 70) return { label: "Medium", className: "border-amber-300/70 bg-amber-50 text-amber-700" }
  return { label: "Low", className: "border-slate-300/70 bg-slate-50 text-slate-700" }
}

function caseRank(a: DuplicateRow, b: DuplicateRow, sortMode: SortMode) {
  if (sortMode === "highest_score") return (b.scores?.faceScore ?? 0) - (a.scores?.faceScore ?? 0)
  if (sortMode === "newest") return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  return new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
}

function isResolvedStatus(status: string) {
  return status === "merged" || status === "not_duplicate"
}

export default function DuplicatesPage() {
  const { user } = useAuth()
  const canReview = user ? canAccess(user.role, "duplicates:review") : false
  const canMerge = user ? canAccess(user.role, "duplicates:merge") : false

  const [rows, setRows] = useState<DuplicateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openCaseId, setOpenCaseId] = useState<string | null>(null)
  const [decisionById, setDecisionById] = useState<Record<string, DecisionAction | null>>({})
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [mergeTargetById, setMergeTargetById] = useState<Record<string, string>>({})
  const [sortMode, setSortMode] = useState<SortMode>("highest_score")
  const [groupMode, setGroupMode] = useState<GroupMode>("by_case")
  const [preset, setPreset] = useState<PresetMode>("all")
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all")
  const [visibleByLane, setVisibleByLane] = useState<Record<string, number>>({})
  const [newByLane, setNewByLane] = useState<Record<string, number>>({})

  const seenIdsRef = useRef<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/duplicates", { cache: "no-store" })
    if (!res.ok) {
      toast.error("Failed to load duplicate cases")
      setRows([])
      setLoading(false)
      return
    }

    const data = await res.json()
    const duplicates = (data.duplicates ?? []) as DuplicateRow[]

    const newCounts: Record<string, number> = {}
    for (const d of duplicates) {
      if (!seenIdsRef.current.has(d.id)) {
        newCounts[d.status] = (newCounts[d.status] ?? 0) + 1
      }
    }
    seenIdsRef.current = new Set(duplicates.map((d) => d.id))

    setRows(duplicates)
    setNewByLane(newCounts)

    setMergeTargetById((prev) => {
      const next = { ...prev }
      for (const d of duplicates) {
        if (!next[d.id]) next[d.id] = d.resident1.id
      }
      return next
    })

    setDecisionById((prev) => {
      const next = { ...prev }
      for (const d of duplicates) {
        if (!next[d.id]) next[d.id] = null
      }
      return next
    })

    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!openCaseId) return
      const openRow = rows.find((r) => r.id === openCaseId)
      if (!openRow) return
      if (openRow.status === "merged") return
      if (e.key === "1") setDecisionById((prev) => ({ ...prev, [openCaseId]: "confirmed_duplicate" }))
      if (e.key === "2") setDecisionById((prev) => ({ ...prev, [openCaseId]: "not_duplicate" }))
      if (e.key === "3") setDecisionById((prev) => ({ ...prev, [openCaseId]: "merge" }))
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        void applyDecision(openRow)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openCaseId, rows])

  const filteredRows = useMemo(() => {
    const now = Date.now()
    let out = rows.filter((r) => {
      const snoozedUntil = r.userStates?.[0]?.snoozedUntil
      return !snoozedUntil || new Date(snoozedUntil).getTime() <= now
    })

    if (preset === "high_risk") out = out.filter((r) => {
      const risk = riskMeta(r).label
      return risk === "Critical" || risk === "High"
    })
    if (preset === "today") {
      const today = new Date().toDateString()
      out = out.filter((r) => new Date(r.detectedAt).toDateString() === today)
    }
    if (preset === "needs_review") out = out.filter((r) => r.status === "flagged" || r.status === "pending_review")

    if (riskFilter !== "all") out = out.filter((r) => riskMeta(r).label === riskFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter((r) => {
        const a = `${r.resident1.firstName} ${r.resident1.fatherName} ${r.resident1.id}`.toLowerCase()
        const b = `${r.resident2.firstName} ${r.resident2.fatherName} ${r.resident2.id}`.toLowerCase()
        return a.includes(q) || b.includes(q) || r.id.toLowerCase().includes(q)
      })
    }

    return out
  }, [rows, preset, riskFilter, search])

  const groupedCards = useMemo(() => {
    const laneMap: Record<string, CardUnit[]> = Object.fromEntries(COLUMNS.map((c) => [c.key, []]))

    if (groupMode === "by_case") {
      for (const row of filteredRows) {
        if (!laneMap[row.status]) laneMap[row.status] = []
        laneMap[row.status].push({ key: row.id, lane: row.status, primary: row, cases: [row] })
      }
    } else {
      const buckets = new Map<string, DuplicateRow[]>()
      for (const row of filteredRows) {
        const groupKey = [row.resident1.id, row.resident2.id].sort().join("::")
        if (!buckets.has(groupKey)) buckets.set(groupKey, [])
        buckets.get(groupKey)!.push(row)
      }

      for (const [key, cases] of buckets.entries()) {
        cases.sort((a, b) => caseRank(a, b, sortMode))
        const primary = cases[0]
        if (!laneMap[primary.status]) laneMap[primary.status] = []
        laneMap[primary.status].push({ key, lane: primary.status, primary, cases })
      }
    }

    for (const lane of Object.keys(laneMap)) {
      laneMap[lane].sort((a, b) => caseRank(a.primary, b.primary, sortMode))
    }

    return laneMap
  }, [filteredRows, groupMode, sortMode])

  useEffect(() => {
    setVisibleByLane((prev) => {
      const next = { ...prev }
      for (const c of COLUMNS) {
        if (!next[c.key]) next[c.key] = PAGE_SIZE
      }
      return next
    })
  }, [groupMode, preset, riskFilter, search])

  const allDisplayCases = useMemo(() => {
    const out: DuplicateRow[] = []
    for (const c of COLUMNS) {
      const cards = groupedCards[c.key] ?? []
      for (const card of cards) out.push(card.primary)
    }
    return out
  }, [groupedCards])

  const openCase = useMemo(() => {
    if (!openCaseId) return null
    return rows.find((r) => r.id === openCaseId) ?? null
  }, [rows, openCaseId])

  const openIndex = useMemo(() => {
    if (!openCase) return -1
    return allDisplayCases.findIndex((r) => r.id === openCase.id)
  }, [openCase, allDisplayCases])

  const summary = useMemo(
    () => ({
      total: filteredRows.length,
      pending: filteredRows.filter((r) => r.status === "pending_review" || r.status === "flagged").length,
      merged: filteredRows.filter((r) => r.status === "merged").length,
    }),
    [filteredRows]
  )

  const applyDecision = async (row: DuplicateRow) => {
    if (!canReview) return
    if (row.status === "merged") return toast.error("Resolved cases are read-only")

    const action = decisionById[row.id]
    if (!action) return toast.error("Select a decision first")

    const reviewNotes = (notesById[row.id] ?? "").trim()
    if (!reviewNotes) return toast.error("Add review notes before submitting")

    if (action === "merge" && !canMerge) return toast.error("You do not have merge permission")

    const previousRows = rows
    const optimisticStatus = action === "merge" ? "merged" : action === "confirmed_duplicate" ? "confirmed_duplicate" : "not_duplicate"
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: optimisticStatus } : r)))

    setBusyId(row.id)
    const res = await fetch(`/api/duplicates/${row.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reviewNotes,
        mergedResidentId: action === "merge" ? mergeTargetById[row.id] : undefined,
      }),
    })
    setBusyId(null)

    if (!res.ok) {
      setRows(previousRows)
      const data = await res.json().catch(() => null)
      toast.error(data?.error ?? "Failed to apply decision")
      return
    }

    toast.success(action === "merge" ? "Case merged" : action === "confirmed_duplicate" ? "Case confirmed" : "Case marked not duplicate")
    setOpenCaseId(null)
    await load()
  }

  const applyWorkflow = async (
    row: DuplicateRow,
    action: "snooze" | "escalate" | "assign",
    payload?: { snoozeHours?: number; assignedTo?: string | null }
  ) => {
    setBusyId(row.id)
    const res = await fetch(`/api/duplicates/${row.id}/workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    })
    setBusyId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error ?? `Failed to ${action} case`)
      return
    }

    if (action === "snooze") toast.success("Case snoozed for your account")
    if (action === "escalate") toast.success("Case escalated")
    if (action === "assign") toast.success(payload?.assignedTo ? "Case assigned to you" : "Case unassigned")
    await load()
  }

  const nextCase = () => {
    if (openIndex < 0 || openIndex >= allDisplayCases.length - 1) return
    setOpenCaseId(allDisplayCases[openIndex + 1].id)
  }

  const prevCase = () => {
    if (openIndex <= 0) return
    setOpenCaseId(allDisplayCases[openIndex - 1].id)
  }

  return (
    <PageShell title="Duplicate Detection" hideHeader>
      <OpsPageIntro
        eyebrow="Duplicate Resolution"
        title="Face-assisted duplicate investigation board"
        description="Prioritize suspected duplicates by risk, compare both resident profiles, and execute review, merge, or rejection decisions with full operational traceability."
        links={[
          { label: "Risk Search", href: "/duplicates", icon: ShieldX },
          { label: "Review", href: "/duplicates", icon: CheckCircle2 },
          { label: "Merge", href: "/duplicates", icon: GitMerge },
        ]}
      />
      <WorkspaceCard
        title="Case Board"
        description={`${summary.total} cases · ${summary.pending} in review flow · ${summary.merged} resolved`}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={preset} onValueChange={(v) => setPreset(v as PresetMode)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Preset" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Preset: All</SelectItem>
                <SelectItem value="high_risk">Preset: High Risk</SelectItem>
                <SelectItem value="today">Preset: Today</SelectItem>
                <SelectItem value="needs_review">Preset: Needs Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="highest_score">Sort: Highest Score</SelectItem>
                <SelectItem value="newest">Sort: Newest First</SelectItem>
                <SelectItem value="oldest">Sort: Oldest First</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grouping" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="by_case">Group: By Case</SelectItem>
                <SelectItem value="by_person">Group: By Person</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as "all" | RiskLevel)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Risk: All</SelectItem>
                <SelectItem value="Critical">Risk: Critical</SelectItem>
                <SelectItem value="High">Risk: High</SelectItem>
                <SelectItem value="Medium">Risk: Medium</SelectItem>
                <SelectItem value="Low">Risk: Low</SelectItem>
              </SelectContent>
            </Select>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, resident ID, or case ID" className="w-[280px]" />
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCcw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
        }
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading duplicate cases...</p>
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-4 xl:overflow-visible xl:pb-0">
            {COLUMNS.map((column) => {
              const cards = groupedCards[column.key] ?? []
              const visible = visibleByLane[column.key] ?? PAGE_SIZE
              const sliced = cards.slice(0, visible)

              return (
                <section key={column.key} className={cn("min-w-[320px] snap-start rounded-2xl border p-3 xl:min-w-0", column.tone)}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{column.title}</h3>
                    <div className="flex items-center gap-2">
                      {(newByLane[column.key] ?? 0) > 0 && <Badge>{newByLane[column.key]} new</Badge>}
                      <Badge variant="outline">{cards.length}</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sliced.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">No cases in this stage</p>
                    ) : (
                      sliced.map((unit) => {
                        const d = unit.primary
                        const risk = riskMeta(d)
                        return (
                          <Card key={unit.key} className="gap-0 py-0">
                            <CardContent className="space-y-3 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">Case {d.id.slice(0, 8)}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(d.detectedAt).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="outline">{d.overallScore}</Badge>
                                  <Badge className={cn("border", risk.className)}>{risk.label}</Badge>
                                  {d.escalated && <Badge>Escalated</Badge>}
                                </div>
                              </div>

                              <div className="text-xs text-muted-foreground">
                                <p>{d.resident1.firstName} {d.resident1.fatherName}</p>
                                <p>{d.resident2.firstName} {d.resident2.fatherName}</p>
                                {d.assignee ? <p className="mt-1">Assigned: {d.assignee.firstName} {d.assignee.lastName}</p> : <p className="mt-1">Assigned: Unassigned</p>}
                                {unit.cases.length > 1 && <p className="mt-1 font-medium text-foreground">+{unit.cases.length - 1} related cases</p>}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <Button size="sm" variant="outline" onClick={() => setOpenCaseId(d.id)}>
                                  {d.status === "merged" ? "View" : "Review"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void applyWorkflow(d, "snooze", { snoozeHours: 24 })}
                                  disabled={busyId === d.id || isResolvedStatus(d.status)}
                                >
                                  Snooze
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void applyWorkflow(d, "escalate")}
                                  disabled={busyId === d.id || isResolvedStatus(d.status)}
                                >
                                  Escalate
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full"
                                onClick={() =>
                                  void applyWorkflow(d, "assign", {
                                    assignedTo: d.assignedTo === user?.id ? null : user?.id ?? null,
                                  })
                                }
                                disabled={busyId === d.id || !user || isResolvedStatus(d.status)}
                              >
                                {d.assignedTo === user?.id ? "Unassign me" : "Assign to me"}
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}

                    {cards.length > visible && (
                      <Button variant="outline" className="w-full" onClick={() => setVisibleByLane((p) => ({ ...p, [column.key]: (p[column.key] ?? PAGE_SIZE) + PAGE_SIZE }))}>
                        Load more
                      </Button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </WorkspaceCard>

      <Sheet open={Boolean(openCase)} onOpenChange={(next) => !next && setOpenCaseId(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {openCase && (
            <>
              <SheetHeader className="border-b">
                <div className="flex items-center justify-between gap-2 pr-8">
                  <div>
                    <SheetTitle>Case {openCase.id}</SheetTitle>
                    <SheetDescription>
                      {riskMeta(openCase).label} risk · Face {openCase.scores?.faceScore ?? 0}% · Status {openCase.status.replaceAll("_", " ")}
                    </SheetDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" onClick={prevCase} disabled={openIndex <= 0}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" onClick={nextCase} disabled={openIndex < 0 || openIndex >= allDisplayCases.length - 1}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4 overflow-auto p-4">
                {openCase.status === "merged" && (
                  <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/50 p-3 text-sm text-emerald-900">
                    This case is already resolved. It remains visible here as history, but no further review decision can be submitted.
                  </div>
                )}

                <div className="grid gap-3">
                  {[openCase.resident1, openCase.resident2].map((resident, idx) => (
                    <div key={resident.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resident {idx === 0 ? "A" : "B"}</p>
                      <p className="mt-1 text-sm font-semibold">{resident.firstName} {resident.fatherName}</p>
                      <p className="text-xs text-muted-foreground">{resident.id}</p>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                        <p>Face status: {resident.faceStatus ?? "-"}</p>
                        <p>Face quality: {resident.faceEmbedding?.qualityScore ?? "-"}</p>
                        <p>DOB: {resident.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString() : "-"}</p>
                        <p>Phone: {resident.phoneNumber ?? "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {openCase.status !== "merged" && (
                  <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision (Shortcut: 1/2/3)</p>
                    <div className="grid gap-2">
                      <Button type="button" variant={decisionById[openCase.id] === "confirmed_duplicate" ? "default" : "outline"} className="justify-start" onClick={() => setDecisionById((p) => ({ ...p, [openCase.id]: "confirmed_duplicate" }))} disabled={busyId === openCase.id || !canReview}><CheckCircle2 className="mr-2 h-4 w-4" />Confirm Duplicate</Button>
                      <Button type="button" variant={decisionById[openCase.id] === "not_duplicate" ? "default" : "outline"} className="justify-start" onClick={() => setDecisionById((p) => ({ ...p, [openCase.id]: "not_duplicate" }))} disabled={busyId === openCase.id || !canReview}><ShieldX className="mr-2 h-4 w-4" />Not Duplicate</Button>
                      <Button type="button" variant={decisionById[openCase.id] === "merge" ? "default" : "outline"} className="justify-start" onClick={() => setDecisionById((p) => ({ ...p, [openCase.id]: "merge" }))} disabled={busyId === openCase.id || !canMerge}><GitMerge className="mr-2 h-4 w-4" />Merge Records</Button>
                    </div>

                    <div className={cn("hidden", decisionById[openCase.id] === "merge" && "block")}>
                      <Select value={mergeTargetById[openCase.id] ?? openCase.resident1.id} onValueChange={(value) => setMergeTargetById((p) => ({ ...p, [openCase.id]: value }))} disabled={busyId === openCase.id || !canMerge}>
                        <SelectTrigger><SelectValue placeholder="Select survivor record" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={openCase.resident1.id}>Keep {openCase.resident1.firstName} ({openCase.resident1.id})</SelectItem>
                          <SelectItem value={openCase.resident2.id}>Keep {openCase.resident2.firstName} ({openCase.resident2.id})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Textarea value={notesById[openCase.id] ?? ""} onChange={(e) => setNotesById((p) => ({ ...p, [openCase.id]: e.target.value }))} placeholder="Write review notes for this decision" rows={4} disabled={busyId === openCase.id || !canReview} />
                  </div>
                )}
              </div>

              <SheetFooter className="border-t">
                {openCase.status === "merged" ? (
                  <Button variant="outline" onClick={() => setOpenCaseId(null)}>Close</Button>
                ) : (
                  <Button onClick={() => void applyDecision(openCase)} disabled={busyId === openCase.id || !decisionById[openCase.id] || !canReview}>Submit Decision (Ctrl/Cmd+Enter)</Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
