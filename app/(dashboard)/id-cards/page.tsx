"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Plus, ShieldCheck, Download, Eye, ChevronLeft, ChevronRight, CreditCard, CheckCircle2, Clock3, AlertTriangle } from "lucide-react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth/auth-context"
import { canAccess } from "@/lib/auth/permissions"

const ITEMS_PER_PAGE = 10

export default function IdCardsPage() {
  const { user } = useAuth()
  const canGenerate = user ? canAccess(user.role, "id:generate") : false
  const canVerify = user ? canAccess(user.role, "id:verify") : false
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [residents, setResidents] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/residents", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setResidents(data.residents ?? [])
    }
    void load()
  }, [])

  const residentsWithIds = useMemo(
    () => residents.filter((r) => typeof r.idNumber === "string" && r.idNumber.trim().length > 0),
    [residents]
  )

  const filtered = useMemo(() => {
    return residentsWithIds.filter((r) => {
      const matchesQuery =
        !query ||
        (r.idNumber ?? "").toLowerCase().includes(query.toLowerCase()) ||
        r.firstName.toLowerCase().includes(query.toLowerCase()) ||
        r.fatherName.toLowerCase().includes(query.toLowerCase()) ||
        r.grandFatherName.toLowerCase().includes(query.toLowerCase())

      const idStatus = r.idStatus ?? "pending"
      const matchesStatus = statusFilter === "all" || idStatus === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [residentsWithIds, query, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totals = useMemo(() => {
    const active = residentsWithIds.filter((r) => (r.idStatus ?? "pending") === "active").length
    const pending = residents.filter((r) => !r.idNumber && r.status === "inactive" && r.idStatus === "pending").length
    const expired = residentsWithIds.filter((r) => r.idStatus === "expired").length
    return { issued: residentsWithIds.length, active, pending, expired }
  }, [residentsWithIds, residents])

  return (
    <PageShell
      title="ID Cards"
      hideHeader
      actions={
        <div className="flex gap-2">
          {canVerify && (
            <Link href="/id-cards/verify">
              <Button variant="outline">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify ID
              </Button>
            </Link>
          )}
          {canGenerate && (
            <Link href="/id-cards/generate">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate ID
              </Button>
            </Link>
          )}
        </div>
      }
    >
      <OpsPageIntro
        eyebrow="Identity Card Registry"
        title="All issued ID cards"
        description="Track issuance status, verify ID readiness, and inspect resident-to-card linkage from one consolidated registry."
        links={[
          { label: "All ID Cards", href: "/id-cards", icon: Eye },
          { label: "Generate", href: "/id-cards/generate", icon: Plus },
          { label: "Verify", href: "/id-cards/verify", icon: ShieldCheck },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Issued" description="Total generated IDs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold tracking-[-0.03em]">{totals.issued}</p>
              <span className="rounded-none border border-sky-300/80 bg-sky-50 p-1.5 text-sky-700">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Total resident cards with assigned ID numbers</p>
          </div>
        </WorkspaceCard>
        <WorkspaceCard title="Active" description="Currently valid IDs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold tracking-[-0.03em] text-emerald-700">{totals.active}</p>
              <span className="rounded-none border border-emerald-300/80 bg-emerald-50 p-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Cards that are currently valid in circulation</p>
          </div>
        </WorkspaceCard>
        <WorkspaceCard title="Pending" description="Residents awaiting approval">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold tracking-[-0.03em] text-amber-700">{totals.pending}</p>
              <span className="rounded-none border border-amber-300/80 bg-amber-50 p-1.5 text-amber-700">
                <Clock3 className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Registrations waiting for review/approval</p>
          </div>
        </WorkspaceCard>
        <WorkspaceCard title="Expired" description="Needs renewal/reissue">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold tracking-[-0.03em] text-rose-700">{totals.expired}</p>
              <span className="rounded-none border border-rose-300/80 bg-rose-50 p-1.5 text-rose-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Cards that require renewal or reissue action</p>
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="All ID Records" description={`${filtered.length} records`}>
        <div className="mb-4 grid gap-2 rounded-none border border-border/70 bg-muted/30 p-3 md:grid-cols-2 xl:grid-cols-[2.6fr_1.2fr_auto_auto_auto]">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 rounded-none pl-9"
                placeholder="Search by ID or resident name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">ID Status</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 rounded-none">
                <SelectValue placeholder="ID Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="reissued">Reissued</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-9 self-end rounded-none" variant="outline" onClick={() => window.open("/api/id-cards/export?format=csv", "_blank")}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button className="h-9 self-end rounded-none" variant="outline" onClick={() => window.open("/api/id-cards/export?format=pdf", "_blank")}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            className="h-9 self-end rounded-none"
            variant="ghost"
            onClick={() => {
              setQuery("")
              setStatusFilter("all")
              setCurrentPage(1)
            }}
          >
            Reset
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Kebele</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                    No ID records found
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.firstName} {r.fatherName} {r.grandFatherName}</p>
                        <p className="text-xs text-muted-foreground">Resident #{r.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.idNumber ? (
                        <code className="rounded bg-muted px-2 py-1 text-xs">{r.idNumber}</code>
                      ) : (
                        <Badge variant="outline">Not Issued</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.kebeleName ?? "Unknown"}</TableCell>
                    <TableCell>{r.idIssuedDate ?? "-"}</TableCell>
                    <TableCell>{r.idExpiryDate ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={r.idStatus === "active" ? "default" : "outline"}>
                        {r.idStatus ?? "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/id-cards/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Initiate
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                className="rounded-none"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                className="rounded-none"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </WorkspaceCard>
    </PageShell>
  )
}
