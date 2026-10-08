"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserPlus, CheckCircle2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ResidentStatus = "active" | "inactive" | "deceased" | "transferred_out" | "suspended";
type ResidentGender = "male" | "female";

type SearchRow = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  idNumber: string | null;
  phoneNumber: string | null;
  gender: ResidentGender;
  status: ResidentStatus;
  dateOfBirth: string;
  registrationDate: string;
  kebeleId: string;
  zoneId: string;
  woredaId: string;
  kebele: { id: string; name: string };
};

type SearchMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type SearchPayload = {
  residents: SearchRow[];
  meta: SearchMeta;
};

const LIMIT = 10;

export default function ResidentSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [gender, setGender] = useState("all");
  const [kebeleId, setKebeleId] = useState("all");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchPayload>({
    residents: [],
    meta: { total: 0, page: 1, limit: LIMIT, totalPages: 1 },
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, gender, kebeleId]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          status,
          gender,
          kebeleId,
          page: String(page),
          limit: String(LIMIT),
        });
        const res = await fetch(`/api/residents/search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as SearchPayload;
        if (mounted) setResult(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (mounted) {
          setResult({ residents: [], meta: { total: 0, page: 1, limit: LIMIT, totalPages: 1 } });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [debouncedQuery, status, gender, kebeleId, page]);

  const kebeleOptions = useMemo(() => {
    const map = new Map<string, string>();
    result.residents.forEach((resident) => map.set(resident.kebele.id, resident.kebele.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [result.residents]);

  const exportCsv = () => {
    const header = ["id", "name", "idNumber", "phone", "gender", "status", "kebele", "registrationDate"];
    const rows = result.residents.map((resident) =>
      [
        resident.id,
        `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`,
        resident.idNumber ?? "",
        resident.phoneNumber ?? "",
        resident.gender,
        resident.status,
        resident.kebele.name,
        resident.registrationDate,
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "resident-search-results.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (value: ResidentStatus) => {
    const cls: Record<ResidentStatus, string> = {
      active: "border-emerald-300 bg-emerald-50 text-emerald-700",
      inactive: "border-slate-300 bg-slate-100 text-slate-700",
      deceased: "border-rose-300 bg-rose-50 text-rose-700",
      transferred_out: "border-amber-300 bg-amber-50 text-amber-700",
      suspended: "border-zinc-300 bg-zinc-100 text-zinc-700",
    };
    return (
      <Badge variant="outline" className={cls[value]}>
        {value}
      </Badge>
    );
  };

  return (
    <PageShell title="Resident Search" hideHeader>
      <OpsPageIntro
        eyebrow="Search Console"
        title="High-performance resident lookup"
        description="Use optimized filters and tokenized search to quickly find residents by name, kebele identifiers, or registration metadata."
        links={[
          { label: "Directory", href: "/residents", icon: Users },
          { label: "Search", href: "/residents/search", icon: Search },
          { label: "Register New", href: "/residents/new", icon: UserPlus },
          { label: "Pending Queue", href: "/residents/pending", icon: CheckCircle2 },
        ]}
      />

      <WorkspaceCard title="Search Filters" description="Compact rectangular controls for fast filtering">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[2.7fr_1.2fr_1.2fr_1.4fr_auto]">
          <div>
            <Label className="mb-1 block text-xs">Search Query</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 rounded-none pl-9"
                placeholder="Name, ID number, kebele ID, phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
                <SelectItem value="transferred_out">Transferred Out</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Kebele</Label>
            <Select value={kebeleId} onValueChange={setKebeleId}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kebeles</SelectItem>
                {kebeleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="self-end">
            <Button variant="outline" className="h-9 rounded-none" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Search Results" description={`${result.meta.total.toLocaleString()} matched residents`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Kebele</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Searching...</TableCell>
              </TableRow>
            ) : result.residents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No residents found for the current filters.</TableCell>
              </TableRow>
            ) : (
              result.residents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{resident.firstName} {resident.fatherName} {resident.grandFatherName}</p>
                      <p className="text-xs text-muted-foreground">{resident.phoneNumber || "No phone"}</p>
                    </div>
                  </TableCell>
                  <TableCell>{resident.idNumber || "N/A"}</TableCell>
                  <TableCell>{resident.kebele.name}</TableCell>
                  <TableCell className="capitalize">{resident.gender}</TableCell>
                  <TableCell>{statusBadge(resident.status)}</TableCell>
                  <TableCell>{resident.registrationDate}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="rounded-none" asChild>
                      <Link href={`/residents/${resident.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">
            Page {result.meta.page} of {result.meta.totalPages} • {result.meta.total.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setPage((prev) => Math.min(result.meta.totalPages, prev + 1))}
              disabled={page >= result.meta.totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </WorkspaceCard>
    </PageShell>
  );
}

