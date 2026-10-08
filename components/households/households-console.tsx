"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Home, Search } from "lucide-react";
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

type HouseholdStatus = "active" | "inactive" | "relocated";

type HouseholdRow = {
  id: string;
  headResidentId: string;
  memberCount: number;
  status: HouseholdStatus;
  createdAt: string;
  kebele: { id: string; name: string };
  woreda: { id: string; name: string };
  zone: { id: string; name: string };
  residents: Array<{
    id: string;
    firstName: string;
    fatherName: string;
    grandFatherName: string;
    gender: "male" | "female";
    status: string;
    householdRole: string | null;
  }>;
};

type FiltersState = {
  search: string;
  status: "all" | HouseholdStatus;
  kebeleId: "all" | string;
  fromDate: string;
  toDate: string;
};

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  status: "all",
  kebeleId: "all",
  fromDate: "",
  toDate: "",
};

const STATUS_LABELS: Record<HouseholdStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  relocated: "Relocated",
};

const STATUS_BADGE_CLASS: Record<HouseholdStatus, string> = {
  active: "border-emerald-300 bg-emerald-50 text-emerald-700",
  inactive: "border-slate-300 bg-slate-100 text-slate-700",
  relocated: "border-amber-300 bg-amber-50 text-amber-700",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}

function residentName(resident: { firstName: string; fatherName: string; grandFatherName: string }) {
  return `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`;
}

function exportRows(rows: HouseholdRow[], filenamePrefix: string) {
  const header = ["id", "head", "kebele", "woreda", "zone", "memberCount", "status", "createdAt"];
  const csvRows = rows.map((row) => {
    const head = row.residents.find((r) => r.id === row.headResidentId);
    return [
      row.id,
      head ? residentName(head) : "Unknown",
      row.kebele.name,
      row.woreda.name,
      row.zone.name,
      row.memberCount,
      row.status,
      row.createdAt,
    ]
      .map((field) => `"${String(field).replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [header.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HouseholdsConsole({ initialHouseholds }: { initialHouseholds: HouseholdRow[] }) {
  const PAGE_SIZE = 10;
  const [households, setHouseholds] = useState<HouseholdRow[]>(initialHouseholds);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const kebeles = useMemo(() => {
    const map = new Map<string, string>();
    households.forEach((h) => map.set(h.kebele.id, h.kebele.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [households]);

  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (filters.status !== "all" && h.status !== filters.status) return false;
      if (filters.kebeleId !== "all" && h.kebele.id !== filters.kebeleId) return false;
      if (filters.fromDate && new Date(h.createdAt) < new Date(`${filters.fromDate}T00:00:00`)) return false;
      if (filters.toDate && new Date(h.createdAt) > new Date(`${filters.toDate}T23:59:59`)) return false;
      const q = filters.search.trim().toLowerCase();
      if (!q) return true;
      const head = h.residents.find((r) => r.id === h.headResidentId);
      const haystack = [
        h.id,
        h.kebele.name,
        h.woreda.name,
        h.zone.name,
        head ? residentName(head) : "unknown",
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [households, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredHouseholds.length / PAGE_SIZE));
  const paginatedHouseholds = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredHouseholds.slice(start, start + PAGE_SIZE);
  }, [filteredHouseholds, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.kebeleId, filters.fromDate, filters.toDate, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const analytics = useMemo(() => {
    const byStatus = (Object.keys(STATUS_LABELS) as HouseholdStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: filteredHouseholds.filter((h) => h.status === status).length,
    }));
    const byKebeleMap = new Map<string, number>();
    filteredHouseholds.forEach((h) => {
      byKebeleMap.set(h.kebele.name, (byKebeleMap.get(h.kebele.name) ?? 0) + 1);
    });
    const byKebele = Array.from(byKebeleMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return {
      byStatus,
      byKebele,
      maxStatus: Math.max(1, ...byStatus.map((s) => s.count)),
      maxKebele: Math.max(1, ...byKebele.map((k) => k.count)),
    };
  }, [filteredHouseholds]);

  const activeHousehold =
    paginatedHouseholds.find((h) => h.id === activeId) ??
    filteredHouseholds.find((h) => h.id === activeId) ??
    households.find((h) => h.id === activeId) ??
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
    const ids = paginatedHouseholds.map((h) => h.id);
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

  const allPageSelected = paginatedHouseholds.length > 0 && paginatedHouseholds.every((h) => selectedIds.has(h.id));

  const patchStatus = async (id: string, status: HouseholdStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/households/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update household");
      const payload = (await res.json()) as { household: HouseholdRow };
      setHouseholds((prev) => prev.map((h) => (h.id === id ? { ...h, ...payload.household, createdAt: new Date(payload.household.createdAt).toISOString() } : h)));
      toast.success("Household status updated.");
    } catch {
      toast.error("Failed to update household status.");
    } finally {
      setSaving(false);
    }
  };

  const bulkStatus = async (status: HouseholdStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select one or more households first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/households/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      if (!res.ok) throw new Error("Failed bulk update");
      setHouseholds((prev) => prev.map((h) => (selectedIds.has(h.id) ? { ...h, status } : h)));
      setSelectedIds(new Set());
      toast.success("Bulk household status update completed.");
    } catch {
      toast.error("Bulk household status update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <WorkspaceCard title="Household Controls" description="Compact filters, list controls, and exports">
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2.6fr_1.3fr_1.3fr_1fr_1fr]">
            <div>
              <Label className="mb-1 block text-xs">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 rounded-none pl-9"
                  placeholder="Household ID, head name, location..."
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
                  {(Object.keys(STATUS_LABELS) as HouseholdStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Kebele</Label>
              <Select value={filters.kebeleId} onValueChange={(value) => setFilters((prev) => ({ ...prev, kebeleId: value }))}>
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kebeles</SelectItem>
                  {kebeles.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
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
            <Button variant="outline" size="sm" onClick={() => exportRows(filteredHouseholds, "households-filtered")}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Filtered
            </Button>
            <Button variant="outline" size="sm" onClick={() => bulkStatus("active")} disabled={saving || selectedIds.size === 0}>Bulk Active</Button>
            <Button variant="outline" size="sm" onClick={() => bulkStatus("inactive")} disabled={saving || selectedIds.size === 0}>Bulk Inactive</Button>
            <Button variant="outline" size="sm" onClick={() => bulkStatus("relocated")} disabled={saving || selectedIds.size === 0}>Bulk Relocated</Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title={viewMode === "table" ? "Household Table" : "Household Timeline"} description={`${filteredHouseholds.length} records`}>
        {viewMode === "table" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} /></TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHouseholds.map((h) => {
                const head = h.residents.find((r) => r.id === h.headResidentId);
                return (
                  <TableRow key={h.id}>
                    <TableCell><input type="checkbox" checked={selectedIds.has(h.id)} onChange={() => toggleSelect(h.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{h.id}</TableCell>
                    <TableCell>{head ? residentName(head) : "Unknown"}</TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">{h.kebele.name}</p>
                      <p className="text-xs text-muted-foreground">{h.woreda.name}</p>
                    </TableCell>
                    <TableCell>{h.memberCount}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_BADGE_CLASS[h.status]}>{STATUS_LABELS[h.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setActiveId(h.id)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/households/${h.id}`}><Home className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-3">
            {paginatedHouseholds.map((h) => {
              const head = h.residents.find((r) => r.id === h.headResidentId);
              return (
                <div key={h.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={STATUS_BADGE_CLASS[h.status]}>{STATUS_LABELS[h.status]}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium">{head ? residentName(head) : "Unknown Head"}</p>
                      <p className="text-xs text-muted-foreground">{h.kebele.name} • {h.memberCount} members</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setActiveId(h.id)}><Eye className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {(paginatedHouseholds.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1)}-
            {(currentPage - 1) * PAGE_SIZE + paginatedHouseholds.length} of {filteredHouseholds.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Household Analytics" description="Status and kebele distribution from filtered records">
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
            <p className="text-sm font-semibold">Top Kebeles</p>
            {analytics.byKebele.length === 0 && <p className="text-xs text-muted-foreground">No data for current filters.</p>}
            {analytics.byKebele.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.name}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.count / analytics.maxKebele) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </WorkspaceCard>

      <Sheet open={Boolean(activeHousehold)} onOpenChange={(open) => !open && setActiveId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Household Drilldown</SheetTitle>
            <SheetDescription>Review composition and execute quick status updates</SheetDescription>
          </SheetHeader>
          {activeHousehold && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Household ID</p>
                <p className="font-mono text-xs">{activeHousehold.id}</p>
                <p className="mt-2 text-xs text-muted-foreground">Location</p>
                <p className="text-sm">{activeHousehold.kebele.name}, {activeHousehold.woreda.name}, {activeHousehold.zone.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">Members</p>
                <p className="text-sm">{activeHousehold.memberCount}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => patchStatus(activeHousehold.id, "active")} disabled={saving}>Mark Active</Button>
                <Button variant="outline" onClick={() => patchStatus(activeHousehold.id, "inactive")} disabled={saving}>Mark Inactive</Button>
                <Button variant="outline" onClick={() => patchStatus(activeHousehold.id, "relocated")} disabled={saving}>Mark Relocated</Button>
              </div>
              <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-sm font-semibold">Member Preview</p>
                {activeHousehold.residents.map((resident) => (
                  <div key={resident.id} className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2 text-xs">
                    <span>{residentName(resident)}</span>
                    <Badge variant="outline">{resident.householdRole ?? "member"}</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" asChild>
                <Link href={`/households/${activeHousehold.id}`}>Open Full Household Page</Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

