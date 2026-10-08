"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, CheckCircle2, Download, Eye, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceCard } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransferStatus, TransferType } from "@prisma/client";

type TransferRow = {
  id: string;
  residentId: string;
  resident: {
    id: string;
    firstName: string;
    fatherName: string;
    grandFatherName: string;
    idNumber: string | null;
  };
  sourceKebele: { id: string; name: string };
  destinationKebele: { id: string; name: string };
  transferType: TransferType;
  status: TransferStatus;
  reason: string;
  rejectionReason: string | null;
  initiatedAt: string;
  initiatedByUser: { id: string; firstName: string; lastName: string };
  requiresNewId: boolean;
  newIdNumber: string | null;
};

type FiltersState = {
  search: string;
  status: "all" | TransferStatus;
  type: "all" | TransferType;
  initiator: "all" | string;
  fromDate: string;
  toDate: string;
};

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  status: "all",
  type: "all",
  initiator: "all",
  fromDate: "",
  toDate: "",
};

const STATUS_LABELS: Record<TransferStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_destination: "Pending Destination",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_LABELS: Record<TransferType, string> = {
  within_woreda: "Within Woreda",
  cross_woreda: "Cross Woreda",
  cross_zone: "Cross Zone",
};

const STATUS_BADGE_CLASS: Record<TransferStatus, string> = {
  draft: "border-zinc-300 bg-zinc-100 text-zinc-700",
  submitted: "border-sky-300 bg-sky-50 text-sky-700",
  pending_destination: "border-indigo-300 bg-indigo-50 text-indigo-700",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-300 bg-rose-50 text-rose-700",
  completed: "border-teal-300 bg-teal-50 text-teal-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}

function residentName(transfer: TransferRow) {
  return `${transfer.resident.firstName} ${transfer.resident.fatherName} ${transfer.resident.grandFatherName}`;
}

function exportRows(rows: TransferRow[], filenamePrefix: string) {
  const header = ["id", "resident", "from", "to", "type", "status", "initiatedAt", "initiatedBy"];
  const csvRows = rows.map((row) =>
    [
      row.id,
      residentName(row),
      row.sourceKebele.name,
      row.destinationKebele.name,
      row.transferType,
      row.status,
      row.initiatedAt,
      `${row.initiatedByUser.firstName} ${row.initiatedByUser.lastName}`,
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TransfersConsole({ initialTransfers }: { initialTransfers: TransferRow[] }) {
  const PAGE_SIZE = 10;
  const [transfers, setTransfers] = useState(initialTransfers);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initiators = useMemo(() => {
    const map = new Map<string, string>();
    for (const transfer of transfers) {
      map.set(transfer.initiatedByUser.id, `${transfer.initiatedByUser.firstName} ${transfer.initiatedByUser.lastName}`);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) => {
      if (filters.status !== "all" && transfer.status !== filters.status) return false;
      if (filters.type !== "all" && transfer.transferType !== filters.type) return false;
      if (filters.initiator !== "all" && transfer.initiatedByUser.id !== filters.initiator) return false;
      if (filters.fromDate && new Date(transfer.initiatedAt) < new Date(`${filters.fromDate}T00:00:00`)) return false;
      if (filters.toDate && new Date(transfer.initiatedAt) > new Date(`${filters.toDate}T23:59:59`)) return false;
      const q = filters.search.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        residentName(transfer),
        transfer.resident.idNumber ?? "",
        transfer.sourceKebele.name,
        transfer.destinationKebele.name,
        STATUS_LABELS[transfer.status],
        TYPE_LABELS[transfer.transferType],
        transfer.reason,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [transfers, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / PAGE_SIZE));
  const paginatedTransfers = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTransfers.slice(start, start + PAGE_SIZE);
  }, [filteredTransfers, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.type, filters.initiator, filters.fromDate, filters.toDate, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const analytics = useMemo(() => {
    const byStatus = (Object.keys(STATUS_LABELS) as TransferStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: filteredTransfers.filter((t) => t.status === status).length,
    }));
    const monthly = new Map<string, number>();
    for (const transfer of filteredTransfers) {
      const key = transfer.initiatedAt.slice(0, 7);
      monthly.set(key, (monthly.get(key) ?? 0) + 1);
    }
    const byMonth = Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
    return {
      byStatus,
      byMonth,
      maxStatus: Math.max(1, ...byStatus.map((s) => s.count)),
      maxMonth: Math.max(1, ...byMonth.map((m) => m.count)),
    };
  }, [filteredTransfers]);

  const activeTransfer =
    paginatedTransfers.find((t) => t.id === activeTransferId) ??
    filteredTransfers.find((t) => t.id === activeTransferId) ??
    transfers.find((t) => t.id === activeTransferId) ??
    null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    const ids = paginatedTransfers.map((t) => t.id);
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const allPageSelected = paginatedTransfers.length > 0 && paginatedTransfers.every((t) => selectedIds.has(t.id));

  const applyAction = async (id: string, action: "approve" | "reject" | "complete" | "cancel") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Transfer update failed");
      const payload = (await res.json()) as { transfer: TransferRow };
      setTransfers((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload.transfer } : item)));
      toast.success(`Transfer ${action} successful.`);
    } catch {
      toast.error(`Transfer ${action} failed.`);
    } finally {
      setSaving(false);
    }
  };

  const applyBulkAction = async (action: "approve" | "reject" | "complete" | "cancel") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select one or more transfers first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transfers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) throw new Error("Bulk transfer action failed");
      setTransfers((prev) =>
        prev.map((item) => (selectedIds.has(item.id) ? { ...item, status: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "complete" ? "completed" : "cancelled" } : item)),
      );
      setSelectedIds(new Set());
      toast.success(`Bulk ${action} successful.`);
    } catch {
      toast.error(`Bulk ${action} failed.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <WorkspaceCard title="Transfer Controls" description="Compact filters, status actions, and exports">
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2.4fr_1.2fr_1.2fr_1.4fr_1fr_1fr]">
            <div>
              <Label className="mb-1 block text-xs">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 rounded-none pl-9"
                  placeholder="Resident, ID, source, destination..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Status</Label>
              <Select value={filters.status} onValueChange={(value: FiltersState["status"]) => setFilters((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.keys(STATUS_LABELS) as TransferStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Type</Label>
              <Select value={filters.type} onValueChange={(value: FiltersState["type"]) => setFilters((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.keys(TYPE_LABELS) as TransferType[]).map((type) => (
                    <SelectItem key={type} value={type}>{TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Initiated By</Label>
              <Select value={filters.initiator} onValueChange={(value) => setFilters((prev) => ({ ...prev, initiator: value }))}>
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {initiators.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">From</Label>
              <Input className="h-9 rounded-none" type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">To</Label>
              <Input className="h-9 rounded-none" type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "table" | "timeline")} className="w-auto">
              <TabsList className="rounded-md">
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => exportRows(filteredTransfers, "transfers-filtered")}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Filtered
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyBulkAction("approve")} disabled={saving || selectedIds.size === 0}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Bulk Approve
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyBulkAction("reject")} disabled={saving || selectedIds.size === 0}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Bulk Reject
            </Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={viewMode === "table" ? "Transfer Table" : "Transfer Timeline"} description={`${filteredTransfers.length} records`}>
        {viewMode === "table" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} /></TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Initiated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell><input type="checkbox" checked={selectedIds.has(transfer.id)} onChange={() => toggleSelect(transfer.id)} /></TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p>{residentName(transfer)}</p>
                      <p className="text-xs text-muted-foreground">{transfer.resident.idNumber ?? "No ID Number"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-muted-foreground">{transfer.sourceKebele.name}</p>
                    <p className="text-xs text-muted-foreground">to</p>
                    <p className="text-xs text-muted-foreground">{transfer.destinationKebele.name}</p>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[transfer.transferType]}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_BADGE_CLASS[transfer.status]}>{STATUS_LABELS[transfer.status]}</Badge></TableCell>
                  <TableCell>
                    <p className="text-xs">{formatDate(transfer.initiatedAt)}</p>
                    <p className="text-xs text-muted-foreground">{transfer.initiatedByUser.firstName} {transfer.initiatedByUser.lastName}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setActiveTransferId(transfer.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => applyAction(transfer.id, "approve")} disabled={saving}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => applyAction(transfer.id, "reject")} disabled={saving}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-3">
            {paginatedTransfers.map((transfer) => (
              <div key={transfer.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className={STATUS_BADGE_CLASS[transfer.status]}>{STATUS_LABELS[transfer.status]}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(transfer.initiatedAt)}</span>
                    </div>
                    <p className="text-sm font-medium">{residentName(transfer)}</p>
                    <p className="text-xs text-muted-foreground">{transfer.sourceKebele.name} to {transfer.destinationKebele.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setActiveTransferId(transfer.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {(paginatedTransfers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1)}-
            {(currentPage - 1) * PAGE_SIZE + paginatedTransfers.length} of {filteredTransfers.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Transfer Analytics" description="Status and monthly trends from filtered records">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-semibold">By Status</p>
            {analytics.byStatus.map((item) => (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / analytics.maxStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-semibold">By Month</p>
            {analytics.byMonth.length === 0 && <p className="text-xs text-muted-foreground">No data for current filters.</p>}
            {analytics.byMonth.map((item) => (
              <div key={item.month} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.month}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.count / analytics.maxMonth) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </WorkspaceCard>

      <Sheet open={Boolean(activeTransfer)} onOpenChange={(open) => !open && setActiveTransferId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Transfer Drilldown</SheetTitle>
            <SheetDescription>Review transfer details and execute quick workflow actions</SheetDescription>
          </SheetHeader>
          {activeTransfer && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Resident</p>
                <p className="font-semibold">{residentName(activeTransfer)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Transfer Route</p>
                <p className="text-sm">{activeTransfer.sourceKebele.name} to {activeTransfer.destinationKebele.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">Reason</p>
                <p className="text-sm">{activeTransfer.reason}</p>
                {activeTransfer.rejectionReason && (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">Rejection Reason</p>
                    <p className="text-sm">{activeTransfer.rejectionReason}</p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => applyAction(activeTransfer.id, "approve")} disabled={saving}>Approve</Button>
                <Button variant="outline" onClick={() => applyAction(activeTransfer.id, "reject")} disabled={saving}>Reject</Button>
                <Button variant="outline" onClick={() => applyAction(activeTransfer.id, "complete")} disabled={saving}>Complete</Button>
                <Button variant="outline" onClick={() => applyAction(activeTransfer.id, "cancel")} disabled={saving}>Cancel</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/residents/${activeTransfer.resident.id}`}>Open Resident Profile</Link>
                </Button>
                <Button variant="outline" onClick={() => exportRows([activeTransfer], `transfer-${activeTransfer.id}`)}>
                  Export Transfer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
