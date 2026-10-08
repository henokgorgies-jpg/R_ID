"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Clock3, Search, UserPlus, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type PendingResident = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  kebeleName: string;
  maritalStatus: string;
  householdRole?: string | null;
  registrationDate: string;
  createdAt: string;
  registeredByName: string;
  registeredByEmail: string;
  queueRank: number;
  duplicateHint?: {
    duplicateCaseId: string;
    peerResidentId: string;
    peerName: string;
    peerWoredaName?: string | null;
    peerKebeleName?: string | null;
    score: number;
    faceScore: number | null;
    status: string;
    mergedResidentId?: string | null;
    detectedAt: string;
  } | null;
};

export default function PendingResidentsPage() {
  const PAGE_SIZE = 10;
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingResident[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [kebeleFilter, setKebeleFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(1);

  const canReview = user?.role === "super_admin";

  const load = async () => {
    const res = await fetch("/api/residents/pending", { cache: "no-store" });
    if (!res.ok) {
      setRows([]);
      return;
    }
    const data = await res.json();
    setRows(data.residents ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kebeleFilter !== "all" && r.kebeleName !== kebeleFilter) return false;
      if (riskFilter === "high_risk" && !r.duplicateHint) return false;
      if (riskFilter === "clean" && r.duplicateHint) return false;
      if (!q) return true;
      const haystack = [
        r.firstName,
        r.fatherName,
        r.grandFatherName,
        r.id,
        r.kebeleName,
        r.registeredByName,
        r.registeredByEmail,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, kebeleFilter, riskFilter]);

  const kebeles = useMemo(() => Array.from(new Set(rows.map((r) => r.kebeleName))).sort(), [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, kebeleFilter, riskFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const allSelected = useMemo(
    () => paginatedRows.length > 0 && paginatedRows.every((r) => selected.includes(r.id)),
    [paginatedRows, selected],
  );
  const selectedRows = useMemo(() => rows.filter((r) => selected.includes(r.id)), [rows, selected]);
  const autoRejectEligibleIds = useMemo(
    () =>
      selectedRows
        .filter((r) => r.duplicateHint?.status === "merged" && r.duplicateHint.mergedResidentId && r.duplicateHint.mergedResidentId !== r.id)
        .map((r) => r.id),
    [selectedRows],
  );

  const toggleAll = () => {
    setSelected((prev) => {
      const ids = paginatedRows.map((r) => r.id);
      const all = ids.length > 0 && ids.every((id) => prev.includes(id));
      if (all) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const doBulk = async (action: "approve" | "reject") => {
    if (!canReview) return;
    if (selected.length === 0) return;
    if (action === "reject" && !rejectReason.trim()) {
      toast.error("Reject reason is required");
      return;
    }
    setIsBusy(true);
    const res = await fetch("/api/residents/bulk-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentIds: selected,
        action,
        reason: action === "reject" ? rejectReason : undefined,
      }),
    });
    setIsBusy(false);
    if (!res.ok) {
      toast.error("Bulk action failed");
      return;
    }
    toast.success(action === "approve" ? "Residents approved" : "Residents rejected");
    setSelected([]);
    setRejectReason("");
    await load();
  };

  const doAutoReject = async () => {
    if (!canReview || selected.length === 0) return;
    if (autoRejectEligibleIds.length === 0) {
      toast.error("Select residents left out of a merged duplicate case");
      return;
    }
    setIsBusy(true);
    const res = await fetch("/api/residents/bulk-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentIds: autoRejectEligibleIds,
        action: "auto_reject",
      }),
    });
    setIsBusy(false);
    if (!res.ok) {
      toast.error("Auto reject failed");
      return;
    }
    const data = await res.json();
    if ((data.updated ?? 0) > 0 && (data.skipped ?? 0) > 0) {
      toast.success(`${data.updated} resident(s) auto-rejected; ${data.skipped} skipped`);
    } else if ((data.updated ?? 0) > 0) {
      toast.success("Selected residents auto-rejected after merged duplicate review");
    } else {
      toast.error("No selected residents were eligible for duplicate auto-reject");
    }
    setSelected([]);
    setRejectReason("");
    await load();
  };

  const waitingLabel = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return "< 1h";
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <PageShell title="Pending Registrations" hideHeader>
      <OpsPageIntro
        eyebrow="Approval Queue"
        title="Pending resident verification queue"
        description="Review newly registered residents, inspect duplicate hints, and approve or reject with explicit reason tracking for audit consistency."
        links={[
          { label: "All Residents", href: "/residents", icon: Search },
          { label: "Register New", href: "/residents/new", icon: UserPlus },
          { label: "Pending Queue", href: "/residents/pending", icon: CheckCircle2 },
        ]}
      />
      <WorkspaceCard title="Queue" description={`${rows.length} residents pending review`}>
        {!canReview ? (
          <p className="text-sm text-muted-foreground">Only super admin can review pending residents.</p>
        ) : (
          <>
            <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[2.4fr_1.3fr_1.3fr_1fr]">
              <div>
                <p className="mb-1 text-xs font-medium">Search</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="h-9 rounded-none pl-9"
                    placeholder="Search resident, kebele, registrar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Kebele</p>
                <select
                  className="h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm"
                  value={kebeleFilter}
                  onChange={(e) => setKebeleFilter(e.target.value)}
                >
                  <option value="all">All Kebeles</option>
                  {kebeles.map((kebele) => (
                    <option key={kebele} value={kebele}>
                      {kebele}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Duplicate Risk</p>
                <select
                  className="h-9 w-full rounded-none border border-input bg-background px-2.5 text-sm"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="high_risk">High Risk</option>
                  <option value="clean">No Risk</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium">Reject Reason</p>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Required for reject"
                  className="h-9 rounded-none"
                />
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button onClick={() => void doBulk("approve")} disabled={isBusy || selected.length === 0}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Selected
              </Button>
              <Button variant="destructive" onClick={() => void doBulk("reject")} disabled={isBusy || selected.length === 0}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject Selected
              </Button>
              <Button variant="outline" onClick={() => void doAutoReject()} disabled={isBusy || autoRejectEligibleIds.length === 0}>
                <Bot className="mr-2 h-4 w-4" />
                Auto Reject (Merged Duplicate)
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Kebele</TableHead>
                    <TableHead>Marital</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered By</TableHead>
                    <TableHead>Queue Age</TableHead>
                    <TableHead>Duplicate Insight</TableHead>
                    <TableHead>Registered On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-20 text-center text-muted-foreground">
                        No pending registrations
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{r.queueRank}</TableCell>
                        <TableCell>
                          <p className="font-medium">{r.firstName} {r.fatherName} {r.grandFatherName}</p>
                          <p className="text-xs text-muted-foreground">{r.id}</p>
                        </TableCell>
                        <TableCell>{r.kebeleName}</TableCell>
                        <TableCell className="capitalize">{r.maritalStatus}</TableCell>
                        <TableCell>{r.householdRole ? <Badge variant="outline">{r.householdRole}</Badge> : "-"}</TableCell>
                        <TableCell>
                          <p>{r.registeredByName}</p>
                          <p className="text-xs text-muted-foreground">{r.registeredByEmail}</p>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Clock3 className="h-3.5 w-3.5" />
                            {waitingLabel(r.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {r.duplicateHint ? (
                            <div className="space-y-1 text-xs">
                              <p className="font-medium text-amber-700">
                                {`Possible duplicate with ${r.duplicateHint.peerName}${
                                  r.duplicateHint.peerWoredaName && r.duplicateHint.peerKebeleName
                                    ? ` from ${r.duplicateHint.peerWoredaName} ${r.duplicateHint.peerKebeleName}`
                                    : ""
                                }`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No high-risk match yet</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(r.registrationDate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                Showing {(paginatedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1)}-
                {(page - 1) * PAGE_SIZE + paginatedRows.length} of {filteredRows.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-none" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" className="rounded-none" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </WorkspaceCard>
    </PageShell>
  );
}
