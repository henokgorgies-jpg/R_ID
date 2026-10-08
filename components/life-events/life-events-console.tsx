"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Baby,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  HeartHandshake,
  HeartPulse,
  House,
  Search,
  Signature,
  Unlink2,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceCard } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LifeEventType } from "@prisma/client";

type ResidentSummary = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
};

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
};

type LifeEventRow = {
  id: string;
  eventType: LifeEventType;
  eventDate: string;
  data: unknown;
  notes: string | null;
  documentRefs: string[];
  relatedResidentIds: string[];
  registeredAt: string;
  verifiedAt: string | null;
  resident: ResidentSummary;
  registeredByUser: UserSummary;
  verifiedByUser: UserSummary | null;
};

type SavedView = {
  id: string;
  name: string;
  filters: FiltersState;
};

type FiltersState = {
  search: string;
  eventType: "all" | LifeEventType;
  verification: "all" | "verified" | "pending";
  registrar: "all" | string;
  fromDate: string;
  toDate: string;
};

type EventMeta = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  chipClass: string;
  cardClass: string;
};

const EVENT_META: Record<LifeEventType, EventMeta> = {
  birth: {
    label: "Birth",
    icon: Baby,
    chipClass: "border-sky-300/80 bg-sky-50 text-sky-700",
    cardClass: "border-sky-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(224,242,254,0.78))]",
  },
  death: {
    label: "Death",
    icon: HeartPulse,
    chipClass: "border-slate-300/80 bg-slate-100 text-slate-700",
    cardClass: "border-slate-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(241,245,249,0.82))]",
  },
  marriage: {
    label: "Marriage",
    icon: HeartHandshake,
    chipClass: "border-rose-300/80 bg-rose-50 text-rose-700",
    cardClass: "border-rose-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,228,230,0.8))]",
  },
  divorce: {
    label: "Divorce",
    icon: Unlink2,
    chipClass: "border-orange-300/80 bg-orange-50 text-orange-700",
    cardClass: "border-orange-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(255,237,213,0.8))]",
  },
  address_change: {
    label: "Address Change",
    icon: House,
    chipClass: "border-emerald-300/80 bg-emerald-50 text-emerald-700",
    cardClass: "border-emerald-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(209,250,229,0.78))]",
  },
  name_change: {
    label: "Name Change",
    icon: Signature,
    chipClass: "border-violet-300/80 bg-violet-50 text-violet-700",
    cardClass: "border-violet-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(237,233,254,0.8))]",
  },
  status_change: {
    label: "Status Change",
    icon: UserCog,
    chipClass: "border-amber-300/80 bg-amber-50 text-amber-700",
    cardClass: "border-amber-300/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(254,243,199,0.78))]",
  },
};

const DEFAULT_FILTERS: FiltersState = {
  search: "",
  eventType: "all",
  verification: "all",
  registrar: "all",
  fromDate: "",
  toDate: "",
};

const SAVED_VIEWS_KEY = "life-events-saved-views-v1";

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function residentName(resident: ResidentSummary) {
  return `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`;
}

function describeEventData(eventType: LifeEventType, data: unknown): string {
  if (!data || typeof data !== "object") return "No additional details";
  const payload = data as Record<string, unknown>;

  switch (eventType) {
    case "birth":
      return typeof payload.birthPlace === "string" ? `Birth place: ${payload.birthPlace}` : "Birth recorded";
    case "death":
      return typeof payload.causeOfDeath === "string" ? `Cause: ${payload.causeOfDeath}` : "Death recorded";
    case "marriage":
      return typeof payload.marriagePlace === "string" ? `Marriage place: ${payload.marriagePlace}` : "Marriage recorded";
    case "divorce":
      return "Divorce record updated";
    case "address_change":
      return "Resident address updated";
    case "name_change":
      return "Resident legal name updated";
    case "status_change":
      return typeof payload.newStatus === "string" ? `Status: ${payload.newStatus}` : "Resident status updated";
    default:
      return "Event details available";
  }
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function LifeEventsConsole({ initialEvents }: { initialEvents: LifeEventRow[] }) {
  const PAGE_SIZE = 10;
  const [events, setEvents] = useState<LifeEventRow[]>(initialEvents);
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [docPreview, setDocPreview] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedView[];
      if (Array.isArray(parsed)) setSavedViews(parsed);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  const registrars = useMemo(() => {
    const options = new Map<string, string>();
    for (const event of events) {
      options.set(event.registeredByUser.id, `${event.registeredByUser.firstName} ${event.registeredByUser.lastName}`);
    }
    return Array.from(options.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.eventType !== "all" && event.eventType !== filters.eventType) return false;
      if (filters.verification === "verified" && !event.verifiedAt) return false;
      if (filters.verification === "pending" && event.verifiedAt) return false;
      if (filters.registrar !== "all" && event.registeredByUser.id !== filters.registrar) return false;
      if (filters.fromDate && new Date(event.eventDate) < new Date(`${filters.fromDate}T00:00:00`)) return false;
      if (filters.toDate && new Date(event.eventDate) > new Date(`${filters.toDate}T23:59:59`)) return false;

      const q = filters.search.trim().toLowerCase();
      if (!q) return true;
      const haystack = [
        residentName(event.resident),
        EVENT_META[event.eventType].label,
        event.notes ?? "",
        describeEventData(event.eventType, event.data),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [events, filters]);

  const activeEvent = useMemo(
    () => filteredEvents.find((event) => event.id === activeEventId) ?? events.find((event) => event.id === activeEventId) ?? null,
    [filteredEvents, events, activeEventId],
  );

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const paginatedEvents = useMemo(() => {
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEvents.slice(start, start + PAGE_SIZE);
  }, [filteredEvents, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.eventType, filters.verification, filters.registrar, filters.fromDate, filters.toDate, viewMode]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (activeEvent) {
      setNoteDraft(activeEvent.notes ?? "");
    }
  }, [activeEvent]);

  const analytics = useMemo(() => {
    const typeCounts = Object.entries(EVENT_META).map(([type, meta]) => ({
      type: type as LifeEventType,
      label: meta.label,
      count: filteredEvents.filter((event) => event.eventType === type).length,
    }));
    const monthly = new Map<string, number>();
    for (const event of filteredEvents) {
      const key = event.eventDate.slice(0, 7);
      monthly.set(key, (monthly.get(key) ?? 0) + 1);
    }
    const monthlySeries = Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
    const maxType = Math.max(1, ...typeCounts.map((item) => item.count));
    const maxMonth = Math.max(1, ...monthlySeries.map((item) => item.count));
    return { typeCounts, monthlySeries, maxType, maxMonth };
  }, [filteredEvents]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    const ids = paginatedEvents.map((event) => event.id);
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

  const exportRows = (rows: LifeEventRow[], filenamePrefix: string) => {
    const csvHeader = ["id", "eventType", "resident", "eventDate", "registeredBy", "verified", "notes"];
    const csvRows = rows.map((event) =>
      [
        event.id,
        event.eventType,
        residentName(event.resident),
        event.eventDate,
        `${event.registeredByUser.firstName} ${event.registeredByUser.lastName}`,
        event.verifiedAt ? "verified" : "pending",
        (event.notes ?? "").replace(/"/g, '""'),
      ]
        .map((field) => `"${String(field)}"`)
        .join(","),
    );
    downloadFile(`${filenamePrefix}.csv`, [csvHeader.join(","), ...csvRows].join("\n"), "text/csv;charset=utf-8;");
  };

  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) {
      toast.error("Enter a view name first.");
      return;
    }
    const next: SavedView = {
      id: `view-${Date.now()}`,
      name,
      filters,
    };
    const updated = [next, ...savedViews].slice(0, 10);
    setSavedViews(updated);
    setViewName("");
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    toast.success("Saved view created.");
  };

  const applySavedView = (id: string) => {
    const found = savedViews.find((view) => view.id === id);
    if (!found) return;
    setFilters(found.filters);
    toast.success(`Applied view: ${found.name}`);
  };

  const deleteSavedView = (id: string) => {
    const updated = savedViews.filter((view) => view.id !== id);
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
  };

  const patchEvent = async (id: string, body: { notes?: string; verified?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/life-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update event");
      const payload = (await res.json()) as { event: LifeEventRow };
      setEvents((prev) => prev.map((event) => (event.id === id ? payload.event : event)));
      toast.success("Event updated.");
    } catch {
      toast.error("Could not update event.");
    } finally {
      setSaving(false);
    }
  };

  const runBulk = async (action: "verify" | "unverify") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Select one or more events.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/life-events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) throw new Error("Bulk action failed");
      const nowIso = new Date().toISOString();
      setEvents((prev) =>
        prev.map((event) => {
          if (!selectedIds.has(event.id)) return event;
          if (action === "verify") {
            return { ...event, verifiedAt: nowIso };
          }
          return { ...event, verifiedAt: null, verifiedByUser: null };
        }),
      );
      setSelectedIds(new Set());
      toast.success(`Bulk ${action} completed.`);
    } catch {
      toast.error(`Bulk ${action} failed.`);
    } finally {
      setSaving(false);
    }
  };

  const allPageSelected =
    paginatedEvents.length > 0 && paginatedEvents.every((event) => selectedIds.has(event.id));

  return (
    <div className="space-y-5">
      <WorkspaceCard title="Advanced Controls" description="Search, filters, saved views, and bulk actions">
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2.4fr_1.4fr_1.4fr_1.4fr_1fr_1fr]">
            <div>
              <Label className="mb-1 block text-xs">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 rounded-none pl-9"
                  placeholder="Search resident, event, notes..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Event Type</Label>
              <Select
                value={filters.eventType}
                onValueChange={(value: FiltersState["eventType"]) => setFilters((prev) => ({ ...prev, eventType: value }))}
              >
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(EVENT_META).map(([type, meta]) => (
                    <SelectItem key={type} value={type}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Verification</Label>
              <Select
                value={filters.verification}
                onValueChange={(value: FiltersState["verification"]) => setFilters((prev) => ({ ...prev, verification: value }))}
              >
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Registrar</Label>
              <Select
                value={filters.registrar}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, registrar: value }))}
              >
                <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registrars</SelectItem>
                  {registrars.map((registrar) => (
                    <SelectItem key={registrar.id} value={registrar.id}>{registrar.name}</SelectItem>
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
            <Button variant="outline" size="sm" onClick={() => exportRows(filteredEvents, "life-events-filtered")}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Filtered
            </Button>
            <Button variant="outline" size="sm" onClick={() => runBulk("verify")} disabled={saving || selectedIds.size === 0}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Bulk Verify
            </Button>
            <Button variant="outline" size="sm" onClick={() => runBulk("unverify")} disabled={saving || selectedIds.size === 0}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Bulk Unverify
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportRows(events.filter((e) => selectedIds.has(e.id)), "life-events-selected")} disabled={selectedIds.size === 0}>
              <FileText className="mr-1.5 h-4 w-4" />
              Export Selected
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="Save current filters as a reusable view..."
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
            />
            <Button variant="outline" onClick={saveCurrentView}>Save View</Button>
            <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset Filters</Button>
          </div>
          {savedViews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {savedViews.map((view) => (
                <span key={view.id} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs">
                  <button className="rounded-none font-medium" onClick={() => applySavedView(view.id)}>{view.name}</button>
                  <button className="rounded-none text-muted-foreground" onClick={() => deleteSavedView(view.id)}>x</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </WorkspaceCard>

      <WorkspaceCard
        title={viewMode === "table" ? "Event Table" : "Timeline"}
        description={`${filteredEvents.length} records`}
      >
        {viewMode === "table" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} />
                </TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Registered By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.map((event) => {
                const meta = EVENT_META[event.eventType];
                const Icon = meta?.icon ?? AlertCircle;
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.has(event.id)} onChange={() => toggleSelect(event.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-700" />
                        <Badge variant="outline" className={meta.chipClass}>{meta.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{residentName(event.resident)}</TableCell>
                    <TableCell>{formatEventDate(event.eventDate)}</TableCell>
                    <TableCell>{event.registeredByUser.firstName} {event.registeredByUser.lastName}</TableCell>
                    <TableCell>
                      {event.verifiedAt ? (
                        <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setActiveEventId(event.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => patchEvent(event.id, { verified: !Boolean(event.verifiedAt) })}
                          disabled={saving}
                        >
                          {event.verifiedAt ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => exportRows([event], `life-event-${event.id}`)}>
                          <Download className="h-4 w-4" />
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
            {paginatedEvents.map((event) => {
              const meta = EVENT_META[event.eventType];
              const Icon = meta.icon;
              return (
                <div key={event.id} className={`rounded-xl border p-3 ${meta.cardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-700" />
                        <Badge variant="outline" className={meta.chipClass}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground">{formatEventDate(event.eventDate)}</span>
                      </div>
                      <p className="text-sm font-medium">{residentName(event.resident)}</p>
                      <p className="text-xs text-muted-foreground">{describeEventData(event.eventType, event.data)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setActiveEventId(event.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleSelect(event.id)}>
                        <input type="checkbox" readOnly checked={selectedIds.has(event.id)} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {(paginatedEvents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1)}-
            {(currentPage - 1) * PAGE_SIZE + paginatedEvents.length} of {filteredEvents.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Event Analytics" description="Event-type and monthly trend insights based on active filters">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-semibold">By Event Type</p>
            {analytics.typeCounts.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / analytics.maxType) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-sm font-semibold">By Month</p>
            {analytics.monthlySeries.length === 0 && <p className="text-xs text-muted-foreground">No data for current filters.</p>}
            {analytics.monthlySeries.map((item) => (
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

      <Sheet open={Boolean(activeEvent)} onOpenChange={(open) => !open && setActiveEventId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Event Drilldown</SheetTitle>
            <SheetDescription>Quick actions, notes, and attached documents preview</SheetDescription>
          </SheetHeader>
          {activeEvent && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Event Type</p>
                <p className="font-semibold">{EVENT_META[activeEvent.eventType].label}</p>
                <p className="mt-2 text-xs text-muted-foreground">Resident</p>
                <p className="font-medium">{residentName(activeEvent.resident)}</p>
                <p className="mt-2 text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{describeEventData(activeEvent.eventType, activeEvent.data)}</p>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={4} />
                <Button onClick={() => patchEvent(activeEvent.id, { notes: noteDraft })} disabled={saving}>
                  Save Note
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => patchEvent(activeEvent.id, { verified: !Boolean(activeEvent.verifiedAt) })} disabled={saving}>
                  {activeEvent.verifiedAt ? "Mark Pending" : "Verify Event"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/residents/${activeEvent.resident.id}`}>Open Resident Profile</Link>
                </Button>
                <Button variant="outline" onClick={() => exportRows([activeEvent], `life-event-${activeEvent.id}`)}>
                  Export Event
                </Button>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-sm font-semibold">Document Attachments Preview</p>
                {activeEvent.documentRefs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No document references attached to this event.</p>
                ) : (
                  <div className="space-y-2">
                    {activeEvent.documentRefs.map((ref) => (
                      <div key={ref} className="flex items-center justify-between rounded-md border border-border/60 p-2">
                        <span className="truncate text-xs">{ref}</span>
                        <Button variant="ghost" size="sm" onClick={() => setDocPreview(ref)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {docPreview && (
                  <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Preview for <span className="font-medium text-foreground">{docPreview}</span> is not stored in-file here.
                    {' '}Use your document module/integration endpoint to fetch binary previews.
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
