"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
  UserX,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccess } from "@/lib/auth/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

type ResidentStatus = "active" | "inactive" | "deceased" | "transferred_out" | "suspended";
type Gender = "male" | "female";

type ResidentRow = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  kebeleId: string;
  kebeleName: string;
  zoneId: string;
  woredaId: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: "single" | "married" | "divorced" | "widowed" | "separated";
  nationality: string;
  ethnicity?: string | null;
  religion?: string | null;
  occupation?: string | null;
  email?: string | null;
  address?: {
    city?: string;
    subcity?: string;
    streetName?: string;
    houseNumber?: string;
    parentNameParts?: {
      father?: { firstName?: string; fatherName?: string; grandFatherName?: string };
      mother?: { firstName?: string; fatherName?: string; grandFatherName?: string };
    };
  };
  photoUrl?: string | null;
  householdId?: string | null;
  householdRole?: "head" | "spouse" | "child" | "relative" | "other" | null;
  motherName?: string | null;
  fatherResidentId?: string | null;
  motherResidentId?: string | null;
  status: ResidentStatus;
  idStatus?: "pending" | "active" | "expired" | "revoked" | "reissued" | null;
  phoneNumber: string | null;
  registrationDate: string;
  registeredByName: string;
};

export default function ResidentsPage() {
  const { user } = useAuth();
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [kebeleFilter, setKebeleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const resResidents = await fetch("/api/residents", { cache: "no-store" });
        if (resResidents.ok) {
          const data = (await resResidents.json()) as { residents: ResidentRow[] };
          if (mounted) setResidents(data.residents);
        }
      } catch {
        if (mounted) setResidents([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const scopedResidents = useMemo(() => {
    if (!user) return [];
    let data = [...residents];
    if (user.scope.type === "kebele" && user.scope.kebeleId) data = data.filter((r) => r.kebeleId === user.scope.kebeleId);
    else if (user.scope.type === "woreda" && user.scope.woredaId) data = data.filter((r) => r.woredaId === user.scope.woredaId);
    else if (user.scope.type === "zone" && user.scope.zoneId) data = data.filter((r) => r.zoneId === user.scope.zoneId);
    return data;
  }, [residents, user]);

  const filteredResidents = useMemo(() => {
    let filtered = [...scopedResidents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.firstName.toLowerCase().includes(q) ||
        r.fatherName.toLowerCase().includes(q) ||
        r.grandFatherName.toLowerCase().includes(q) ||
        r.kebeleId.toLowerCase().includes(q) ||
        (r.phoneNumber ?? "").includes(q),
      );
    }
    if (statusFilter !== "all") filtered = filtered.filter((r) => r.status === statusFilter);
    if (genderFilter !== "all") filtered = filtered.filter((r) => r.gender === genderFilter);
    if (kebeleFilter !== "all") filtered = filtered.filter((r) => r.kebeleName === kebeleFilter);
    return filtered;
  }, [scopedResidents, searchQuery, statusFilter, genderFilter, kebeleFilter]);

  const totalPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const availableKebeles = useMemo(() => Array.from(new Set(scopedResidents.map((r) => r.kebeleName))).sort(), [scopedResidents]);

  const getStatusBadge = (status: ResidentStatus) => {
    const variants: Record<ResidentStatus, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      deceased: "destructive",
      transferred_out: "outline",
      suspended: "secondary",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const canCreate = user ? canAccess(user.role, "residents:create") : false;
  const canEdit = user ? canAccess(user.role, "residents:update") : false;
  const canDelete = user ? canAccess(user.role, "residents:delete") : false;
  const canApprove = user?.role === "super_admin";

  const handleApproveResident = async (residentId: string) => {
    const res = await fetch(`/api/residents/${residentId}/approve`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Failed to approve resident");
      return;
    }
    const data = (await res.json()) as { resident: { id: string; status: ResidentStatus; idStatus: ResidentRow["idStatus"] } };
    setResidents((prev) =>
      prev.map((r) =>
        r.id === residentId
          ? { ...r, status: data.resident.status, idStatus: data.resident.idStatus ?? null }
          : r,
      ),
    );
    toast.success("Resident approved successfully");
  };

  const handleRejectResident = async (residentId: string) => {
    const reason = window.prompt("Enter reject reason");
    if (!reason?.trim()) return;
    const res = await fetch(`/api/residents/${residentId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      toast.error("Failed to reject resident");
      return;
    }
    const data = (await res.json()) as { resident: { id: string; status: ResidentStatus; idStatus: ResidentRow["idStatus"] } };
    setResidents((prev) =>
      prev.map((r) =>
        r.id === residentId
          ? { ...r, status: data.resident.status, idStatus: data.resident.idStatus ?? null }
          : r,
      ),
    );
    toast.success("Resident registration rejected");
  };

  return (
    <PageShell
      title="Residents"
      hideHeader
      actions={
        <>
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
          {canApprove && (
            <Link href="/residents/pending"><Button variant="outline">Pending Queue</Button></Link>
          )}
          {canCreate && (
            <Link href="/residents/new"><Button><Plus className="mr-2 h-4 w-4" />Register New</Button></Link>
          )}
        </>
      }
    >
      <OpsPageIntro
        eyebrow="Resident Operations"
        title="All Residents Directory"
        description="Search, verify, and maintain resident records with complete household context, registration trail, and administrative scope controls."
        links={[
          { label: "Directory", href: "/residents", icon: Search },
          { label: "Register New", href: "/residents/new", icon: Plus },
          { label: "Pending Queue", href: "/residents/pending", icon: CheckCircle2 },
        ]}
      />
      <WorkspaceCard title="Resident Directory" description={`${filteredResidents.length} residents found`}>
        <div className="mb-4 grid gap-2 rounded-none border border-border/70 bg-muted/30 p-3 md:grid-cols-2 xl:grid-cols-[2.6fr_1.2fr_1fr_1.5fr_auto_auto_auto]">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Search</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="h-9 rounded-none pl-9"
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
                <SelectItem value="transferred_out">Transferred</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Gender</p>
            <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Genders</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Kebele</p>
            <Select value={kebeleFilter} onValueChange={(v) => { setKebeleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 rounded-none"><SelectValue placeholder="Kebele" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kebeles</SelectItem>
                {availableKebeles.map((kebele) => <SelectItem key={kebele} value={kebele}>{kebele}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="h-9 self-end rounded-none" variant="outline" onClick={() => window.open("/api/residents/export?format=csv", "_blank")}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button className="h-9 self-end rounded-none" variant="outline" onClick={() => window.open("/api/residents/export?format=pdf", "_blank")}>
            <Download className="mr-2 h-4 w-4" />PDF
          </Button>
          <Button
            className="h-9 self-end rounded-none"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setGenderFilter("all");
              setKebeleFilter("all");
              setCurrentPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Kebele ID</TableHead><TableHead>Gender</TableHead><TableHead>Date of Birth</TableHead><TableHead>Kebele</TableHead><TableHead>Registered By</TableHead><TableHead>Registered On</TableHead><TableHead>Status</TableHead><TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Loading residents...</TableCell></TableRow>
              ) : paginatedResidents.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No residents found</TableCell></TableRow>
              ) : (
                paginatedResidents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell><div><p className="font-medium">{resident.firstName} {resident.fatherName} {resident.grandFatherName}</p><p className="text-sm text-muted-foreground">{resident.phoneNumber || "No phone"}</p></div></TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{resident.kebeleId}</code></TableCell>
                    <TableCell className="capitalize">{resident.gender}</TableCell>
                    <TableCell>{resident.dateOfBirth}</TableCell>
                    <TableCell>{resident.kebeleName}</TableCell>
                    <TableCell>{resident.registeredByName}</TableCell>
                    <TableCell>{resident.registrationDate}</TableCell>
                    <TableCell>{getStatusBadge(resident.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <Link href={`/residents/${resident.id}`}><DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem></Link>
                          {canEdit && (
                            <Link href={`/residents/${resident.id}/edit`}><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem></Link>
                          )}
                          {canApprove && resident.status === "inactive" && resident.idStatus === "pending" && (
                            <DropdownMenuItem onClick={() => void handleApproveResident(resident.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />Approve Registration
                            </DropdownMenuItem>
                          )}
                          {canApprove && resident.status === "inactive" && resident.idStatus === "pending" && (
                            <DropdownMenuItem onClick={() => void handleRejectResident(resident.id)} className="text-destructive">
                              <UserX className="mr-2 h-4 w-4" />Reject Registration
                            </DropdownMenuItem>
                          )}
                          {canDelete && (<DropdownMenuItem className="text-destructive"><UserX className="mr-2 h-4 w-4" />Deactivate</DropdownMenuItem>)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredResidents.length)} of {filteredResidents.length} results</p>
            <div className="flex items-center gap-2">
              <Button className="rounded-none" variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" />Previous</Button>
              <Button className="rounded-none" variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </WorkspaceCard>
    </PageShell>
  );
}
