"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  HeartHandshake,
  MapPinned,
  Save,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { canAccess } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { OpsPageIntro } from "@/components/layout/ops-page-intro";
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Gender = "male" | "female";
type ResidentStatus = "active" | "inactive" | "deceased" | "transferred_out" | "suspended";
type ParentLifeStatus = "alive" | "deceased";

type ParentNameParts = {
  firstName?: string;
  fatherName?: string;
  grandFatherName?: string;
  lifeStatus?: ParentLifeStatus;
  zoneId?: string;
  zoneName?: string;
  woredaId?: string;
  woredaName?: string;
  kebeleId?: string;
  kebeleName?: string;
};

type SpouseNameParts = {
  firstName?: string;
  fatherName?: string;
  grandFatherName?: string;
};

type RelativeNameParts = {
  firstName?: string;
  fatherName?: string;
  grandFatherName?: string;
};

export type ResidentEditRecord = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: "single" | "married" | "divorced" | "widowed" | "separated";
  nationality: string;
  ethnicity?: string | null;
  religion?: string | null;
  occupation?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  kebeleName: string;
  householdId?: string | null;
  householdRole?: "head" | "spouse" | "child" | "relative" | "other" | null;
  motherName?: string | null;
  fatherResidentId?: string | null;
  motherResidentId?: string | null;
  photoUrl?: string | null;
  status: ResidentStatus;
  idStatus?: "pending" | "active" | "expired" | "revoked" | "reissued" | null;
  address?: {
    city?: string;
    subcity?: string;
    streetName?: string;
    houseNumber?: string;
    spouseName?: string;
    spouseResidentId?: string;
    spouseNameParts?: SpouseNameParts;
    childrenNames?: string[];
    relatives?: RelativeNameParts[];
    parentNameParts?: {
      father?: ParentNameParts;
      mother?: ParentNameParts;
    };
  };
};

type Geography = {
  zones: Array<{ id: string; name: string }>;
  woredas: Array<{ id: string; zoneId: string; name: string }>;
  kebeles: Array<{ id: string; woredaId: string; name: string }>;
};

type ParentResidentOption = {
  id: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  photoUrl?: string | null;
  phoneNumber?: string | null;
  zoneId: string;
  woredaId: string;
  kebeleId: string;
  householdId?: string | null;
  householdRole?: "head" | "spouse" | "child" | "relative" | "other" | null;
  gender?: Gender;
  maritalStatus?: ResidentEditRecord["maritalStatus"];
  address?: unknown;
};

type ResidentEditPageProps = {
  initialResident: ResidentEditRecord;
  geography: Geography;
  parentResidents: ParentResidentOption[];
};

export function ResidentEditPage({
  initialResident,
  geography,
  parentResidents,
}: ResidentEditPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user ? canAccess(user.role, "residents:update") : false;
  const initialFatherResident = initialResident.fatherResidentId
    ? parentResidents.find((resident) => resident.id === initialResident.fatherResidentId)
    : null;
  const initialMotherResident = initialResident.motherResidentId
    ? parentResidents.find((resident) => resident.id === initialResident.motherResidentId)
    : null;
  const initialLinkedHeadResident =
    initialResident.householdRole && initialResident.householdRole !== "head" && initialResident.householdId
      ? parentResidents.find((resident) => resident.householdRole === "head" && resident.householdId === initialResident.householdId)
      : null;
  const initialSpouseNameParts = initialResident.address?.spouseNameParts;

  const [editing, setEditing] = useState<ResidentEditRecord>(initialResident);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [householdDraft, setHouseholdDraft] = useState(() => ({
    linkedHeadResidentId: initialLinkedHeadResident?.id ?? "",
    spouseResidentId: initialResident.address?.spouseResidentId ?? "",
    spouseFirstName: initialSpouseNameParts?.firstName ?? "",
    spouseFatherName: initialSpouseNameParts?.fatherName ?? "",
    spouseGrandFatherName: initialSpouseNameParts?.grandFatherName ?? "",
    childrenNames: (initialResident.address?.childrenNames ?? []).join("\n"),
    relatives: (initialResident.address?.relatives ?? []).map((relative) => ({
      firstName: relative.firstName ?? "",
      fatherName: relative.fatherName ?? "",
      grandFatherName: relative.grandFatherName ?? "",
    })),
  }));
  const [spouseSearchQuery, setSpouseSearchQuery] = useState(() =>
    [initialSpouseNameParts?.firstName, initialSpouseNameParts?.fatherName, initialSpouseNameParts?.grandFatherName]
      .filter(Boolean)
      .join(" "),
  );
  const [childSearchQuery, setChildSearchQuery] = useState("");
  const [relativeDraft, setRelativeDraft] = useState({
    firstName: "",
    fatherName: "",
    grandFatherName: "",
  });
  const [parentDraft, setParentDraft] = useState(() => {
    const storedFather = initialResident.address?.parentNameParts?.father;
    const storedMother = initialResident.address?.parentNameParts?.mother;
    const motherNameParts = (initialResident.motherName ?? "").split(" ");

    return {
      fatherFirstName: initialFatherResident?.firstName ?? storedFather?.firstName ?? "",
      fatherFatherName: initialFatherResident?.fatherName ?? storedFather?.fatherName ?? "",
      fatherGrandFatherName: initialFatherResident?.grandFatherName ?? storedFather?.grandFatherName ?? "",
      fatherLifeStatus: storedFather?.lifeStatus ?? (initialResident.fatherResidentId ? "alive" : "deceased"),
      fatherZoneId: initialFatherResident?.zoneId ?? storedFather?.zoneId ?? "",
      fatherWoredaId: initialFatherResident?.woredaId ?? storedFather?.woredaId ?? "",
      fatherKebeleId: initialFatherResident?.kebeleId ?? storedFather?.kebeleId ?? "",
      motherFirstName: initialMotherResident?.firstName ?? storedMother?.firstName ?? motherNameParts[0] ?? "",
      motherFatherName: initialMotherResident?.fatherName ?? storedMother?.fatherName ?? motherNameParts[1] ?? "",
      motherGrandFatherName:
        initialMotherResident?.grandFatherName ?? storedMother?.grandFatherName ?? motherNameParts.slice(2).join(" ") ?? "",
      motherLifeStatus: storedMother?.lifeStatus ?? (initialResident.motherResidentId ? "alive" : "deceased"),
      motherZoneId: initialMotherResident?.zoneId ?? storedMother?.zoneId ?? "",
      motherWoredaId: initialMotherResident?.woredaId ?? storedMother?.woredaId ?? "",
      motherKebeleId: initialMotherResident?.kebeleId ?? storedMother?.kebeleId ?? "",
    };
  });

  const parentById = useMemo(() => new Map(parentResidents.map((resident) => [resident.id, resident])), [parentResidents]);
  const parentOptions = useMemo(
    () =>
      parentResidents.map((resident) => ({
        id: resident.id,
        label: `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`,
      })),
    [parentResidents],
  );
  const editAvailableWoredas = useMemo(
    () => geography.woredas.filter((woreda) => woreda.zoneId === editing.zoneId),
    [geography.woredas, editing.zoneId],
  );
  const editAvailableKebeles = useMemo(
    () => geography.kebeles.filter((kebele) => kebele.woredaId === editing.woredaId),
    [geography.kebeles, editing.woredaId],
  );
  const availableHeads = useMemo(
    () =>
      parentResidents.filter((resident) => {
        if (resident.householdRole !== "head" || !resident.householdId) return false;
        if (resident.id === editing.id) return false;
        if (editing.kebeleId) return resident.kebeleId === editing.kebeleId;
        if (editing.woredaId) return resident.woredaId === editing.woredaId;
        if (editing.zoneId) return resident.zoneId === editing.zoneId;
        return true;
      }),
    [parentResidents, editing.id, editing.zoneId, editing.woredaId, editing.kebeleId],
  );
  const allowedHouseholdRoles = useMemo<Array<NonNullable<ResidentEditRecord["householdRole"]>>>(() => {
    if (editing.maritalStatus === "single") {
      return ["head", "child"];
    }
    return ["head", "spouse", "child", "relative"];
  }, [editing.maritalStatus]);
  const fatherAvailableWoredas = useMemo(
    () => geography.woredas.filter((woreda) => woreda.zoneId === parentDraft.fatherZoneId),
    [geography.woredas, parentDraft.fatherZoneId],
  );
  const fatherAvailableKebeles = useMemo(
    () => geography.kebeles.filter((kebele) => kebele.woredaId === parentDraft.fatherWoredaId),
    [geography.kebeles, parentDraft.fatherWoredaId],
  );
  const motherAvailableWoredas = useMemo(
    () => geography.woredas.filter((woreda) => woreda.zoneId === parentDraft.motherZoneId),
    [geography.woredas, parentDraft.motherZoneId],
  );
  const motherAvailableKebeles = useMemo(
    () => geography.kebeles.filter((kebele) => kebele.woredaId === parentDraft.motherWoredaId),
    [geography.kebeles, parentDraft.motherWoredaId],
  );
  const filteredFatherOptions = useMemo(
    () =>
      parentOptions.filter((option) => {
        const resident = parentById.get(option.id);
        if (!resident) return false;
        if (parentDraft.fatherZoneId && resident.zoneId !== parentDraft.fatherZoneId) return false;
        if (parentDraft.fatherWoredaId && resident.woredaId !== parentDraft.fatherWoredaId) return false;
        if (parentDraft.fatherKebeleId && resident.kebeleId !== parentDraft.fatherKebeleId) return false;
        return true;
      }),
    [parentById, parentDraft.fatherZoneId, parentDraft.fatherWoredaId, parentDraft.fatherKebeleId, parentOptions],
  );
  const filteredMotherOptions = useMemo(
    () =>
      parentOptions.filter((option) => {
        const resident = parentById.get(option.id);
        if (!resident) return false;
        if (parentDraft.motherZoneId && resident.zoneId !== parentDraft.motherZoneId) return false;
        if (parentDraft.motherWoredaId && resident.woredaId !== parentDraft.motherWoredaId) return false;
        if (parentDraft.motherKebeleId && resident.kebeleId !== parentDraft.motherKebeleId) return false;
        return true;
      }),
    [parentById, parentDraft.motherZoneId, parentDraft.motherWoredaId, parentDraft.motherKebeleId, parentOptions],
  );
  const spouseResidentOptions = useMemo(
    () =>
      parentResidents.filter((resident) => {
        if (resident.id === editing.id) return false;
        if (editing.zoneId && resident.zoneId !== editing.zoneId) return false;
        if (editing.woredaId && resident.woredaId !== editing.woredaId) return false;
        if (editing.kebeleId && resident.kebeleId !== editing.kebeleId) return false;
        return true;
      }),
    [parentResidents, editing.id, editing.zoneId, editing.woredaId, editing.kebeleId],
  );
  const filteredSpouseOptions = useMemo(() => {
    const query = spouseSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return spouseResidentOptions
      .filter((resident) =>
        `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [spouseResidentOptions, spouseSearchQuery]);
  const filteredChildOptions = useMemo(() => {
    const query = childSearchQuery.trim().toLowerCase();
    if (!query) return [];
    return parentResidents
      .filter((resident) => resident.id !== editing.id)
      .filter((resident) =>
        `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [parentResidents, editing.id, childSearchQuery]);

  useEffect(() => {
    if (!editing.householdRole) return;
    if (!allowedHouseholdRoles.includes(editing.householdRole)) {
      setEditing((prev) => ({ ...prev, householdRole: null, householdId: prev.householdRole === "head" ? prev.householdId : "" }));
      setHouseholdDraft((prev) => ({ ...prev, linkedHeadResidentId: "" }));
    }
  }, [allowedHouseholdRoles, editing.householdRole]);

  const getStatusBadge = (status: ResidentStatus) => {
    const variants: Record<ResidentStatus, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      deceased: "destructive",
      transferred_out: "outline",
      suspended: "secondary",
    };
    return <Badge variant={variants[status]} className="rounded-none">{status}</Badge>;
  };

  const validateEditing = (data: ResidentEditRecord) => {
    const errors: Record<string, string> = {};
    if (!data.firstName.trim()) errors.firstName = "First name is required";
    if (!data.fatherName.trim()) errors.fatherName = "Father name is required";
    if (!data.grandFatherName.trim()) errors.grandFatherName = "Grand father name is required";
    if (!data.dateOfBirth) errors.dateOfBirth = "Date of birth is required";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Invalid email format";
    if (!data.zoneId) errors.zoneId = "Zone is required";
    if (!data.woredaId) errors.woredaId = "Woreda is required";
    if (!data.kebeleId) errors.kebeleId = "Kebele is required";
    if (data.householdRole && !allowedHouseholdRoles.includes(data.householdRole)) {
      errors.householdRole = `Invalid household role '${data.householdRole}' for marital status '${data.maritalStatus}'`;
    }
    if (data.householdRole && data.householdRole !== "head" && !householdDraft.linkedHeadResidentId) {
      errors.linkedHeadResidentId = "Family head is required";
    }
    if (data.householdRole === "head" && data.maritalStatus !== "single") {
      if (!householdDraft.spouseFirstName.trim()) errors.spouseFirstName = "Spouse first name is required";
      if (!householdDraft.spouseFatherName.trim()) errors.spouseFatherName = "Spouse father name is required";
      if (!householdDraft.spouseGrandFatherName.trim()) errors.spouseGrandFatherName = "Spouse grand father name is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onPhotoChange = async (file: File | null) => {
    if (!file || !canEdit) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      setEditing((prev) => ({ ...prev, photoUrl: value }));
    };
    reader.readAsDataURL(file);
  };

  const findResidentByNameParts = (parts: { firstName: string; fatherName: string; grandFatherName: string }) => {
    const normalize = (value: string) => value.trim().toLowerCase();
    if (!parts.firstName || !parts.fatherName || !parts.grandFatherName) return null;
    return (
      parentResidents.find(
        (candidate) =>
          candidate.id !== editing.id &&
          normalize(candidate.firstName) === normalize(parts.firstName) &&
          normalize(candidate.fatherName) === normalize(parts.fatherName) &&
          normalize(candidate.grandFatherName) === normalize(parts.grandFatherName),
      ) ?? null
    );
  };

  const syncParentLinkByName = (role: "father" | "mother") => {
    const isAlive = role === "father" ? parentDraft.fatherLifeStatus === "alive" : parentDraft.motherLifeStatus === "alive";
    if (!isAlive) return;
    const parts =
      role === "father"
        ? {
            firstName: parentDraft.fatherFirstName,
            fatherName: parentDraft.fatherFatherName,
            grandFatherName: parentDraft.fatherGrandFatherName,
          }
        : {
            firstName: parentDraft.motherFirstName,
            fatherName: parentDraft.motherFatherName,
            grandFatherName: parentDraft.motherGrandFatherName,
          };
    const matched = findResidentByNameParts(parts);

    if (role === "father") {
      setEditing((prev) => ({ ...prev, fatherResidentId: matched?.id ?? null }));
      return;
    }

    setEditing((prev) => ({
      ...prev,
      motherResidentId: matched?.id ?? null,
      motherName: [parts.firstName, parts.fatherName, parts.grandFatherName].map((value) => value.trim()).filter(Boolean).join(" "),
    }));
  };

  const getLocationName = (kind: "zone" | "woreda" | "kebele", id: string) => {
    if (!id) return undefined;
    if (kind === "zone") return geography.zones.find((zone) => zone.id === id)?.name;
    if (kind === "woreda") return geography.woredas.find((woreda) => woreda.id === id)?.name;
    return geography.kebeles.find((kebele) => kebele.id === id)?.name;
  };

  const updateHouseholdRole = (value: ResidentEditRecord["householdRole"]) => {
    setEditing((prev) => ({ ...prev, householdRole: value }));
    if (value === "head") {
      setHouseholdDraft((prev) => ({ ...prev, linkedHeadResidentId: "" }));
      return;
    }
    const selectedHead = householdDraft.linkedHeadResidentId
      ? availableHeads.find((head) => head.id === householdDraft.linkedHeadResidentId)
      : null;
    if (selectedHead?.householdId) {
      setEditing((prev) => ({ ...prev, householdId: selectedHead.householdId ?? prev.householdId }));
    }
  };

  const updateLinkedHeadResident = (value: string) => {
    setHouseholdDraft((prev) => ({ ...prev, linkedHeadResidentId: value }));
    const selectedHead = availableHeads.find((head) => head.id === value);
    if (!selectedHead) return;
    setEditing((prev) => ({
      ...prev,
      householdId: selectedHead.householdId ?? prev.householdId,
      zoneId: selectedHead.zoneId,
      woredaId: selectedHead.woredaId,
      kebeleId: selectedHead.kebeleId,
    }));
    if (editing.householdRole === "child") {
      const probableMother = parentResidents.find(
        (resident) =>
          resident.householdId === selectedHead.householdId &&
          resident.householdRole === "spouse" &&
          resident.gender === "female",
      );
      if (probableMother) {
        setEditing((prev) => ({
          ...prev,
          motherName: `${probableMother.firstName} ${probableMother.fatherName} ${probableMother.grandFatherName}`.trim(),
          motherResidentId: prev.motherResidentId || probableMother.id,
        }));
      }
    }
  };

  const updateMaritalStatus = (value: ResidentEditRecord["maritalStatus"]) => {
    setEditing((prev) => ({ ...prev, maritalStatus: value }));
    if (value === "single") {
      setHouseholdDraft((prev) => ({
        ...prev,
        spouseResidentId: "",
        spouseFirstName: "",
        spouseFatherName: "",
        spouseGrandFatherName: "",
        childrenNames: "",
      }));
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("You do not have permission to update residents.");
      return;
    }
    if (!validateEditing(editing)) {
      toast.error("Please fix validation errors before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/residents/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editing,
          fatherResidentId: parentDraft.fatherLifeStatus === "alive" ? editing.fatherResidentId ?? null : null,
          motherResidentId: parentDraft.motherLifeStatus === "alive" ? editing.motherResidentId ?? null : null,
          motherName:
            [parentDraft.motherFirstName, parentDraft.motherFatherName, parentDraft.motherGrandFatherName]
              .map((value) => value.trim())
              .filter(Boolean)
              .join(" ") || editing.motherName || null,
          address: {
            ...(editing.address ?? {}),
            spouseName:
              editing.householdRole === "head" && editing.maritalStatus !== "single"
                ? [householdDraft.spouseFirstName, householdDraft.spouseFatherName, householdDraft.spouseGrandFatherName]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join(" ") || undefined
                : undefined,
            spouseResidentId:
              editing.householdRole === "head" && editing.maritalStatus !== "single"
                ? householdDraft.spouseResidentId || undefined
                : undefined,
            spouseNameParts:
              editing.householdRole === "head" && editing.maritalStatus !== "single"
                ? {
                    firstName: householdDraft.spouseFirstName || undefined,
                    fatherName: householdDraft.spouseFatherName || undefined,
                    grandFatherName: householdDraft.spouseGrandFatherName || undefined,
                  }
                : undefined,
            childrenNames:
              editing.householdRole === "head" && editing.maritalStatus !== "single"
                ? householdDraft.childrenNames
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : [],
            relatives:
              editing.householdRole === "head"
                ? householdDraft.relatives
                    .map((relative) => ({
                      firstName: relative.firstName.trim() || undefined,
                      fatherName: relative.fatherName.trim() || undefined,
                      grandFatherName: relative.grandFatherName.trim() || undefined,
                    }))
                    .filter((relative) => relative.firstName && relative.fatherName && relative.grandFatherName)
                : [],
            parentNameParts: {
              father: {
                firstName: parentDraft.fatherFirstName || undefined,
                fatherName: parentDraft.fatherFatherName || undefined,
                grandFatherName: parentDraft.fatherGrandFatherName || undefined,
                lifeStatus: parentDraft.fatherLifeStatus,
                zoneId: parentDraft.fatherLifeStatus === "alive" ? parentDraft.fatherZoneId || undefined : undefined,
                zoneName:
                  parentDraft.fatherLifeStatus === "alive"
                    ? getLocationName("zone", parentDraft.fatherZoneId || "")
                    : undefined,
                woredaId: parentDraft.fatherLifeStatus === "alive" ? parentDraft.fatherWoredaId || undefined : undefined,
                woredaName:
                  parentDraft.fatherLifeStatus === "alive"
                    ? getLocationName("woreda", parentDraft.fatherWoredaId || "")
                    : undefined,
                kebeleId: parentDraft.fatherLifeStatus === "alive" ? parentDraft.fatherKebeleId || undefined : undefined,
                kebeleName:
                  parentDraft.fatherLifeStatus === "alive"
                    ? getLocationName("kebele", parentDraft.fatherKebeleId || "")
                    : undefined,
              },
              mother: {
                firstName: parentDraft.motherFirstName || undefined,
                fatherName: parentDraft.motherFatherName || undefined,
                grandFatherName: parentDraft.motherGrandFatherName || undefined,
                lifeStatus: parentDraft.motherLifeStatus,
                zoneId: parentDraft.motherLifeStatus === "alive" ? parentDraft.motherZoneId || undefined : undefined,
                zoneName:
                  parentDraft.motherLifeStatus === "alive"
                    ? getLocationName("zone", parentDraft.motherZoneId || "")
                    : undefined,
                woredaId: parentDraft.motherLifeStatus === "alive" ? parentDraft.motherWoredaId || undefined : undefined,
                woredaName:
                  parentDraft.motherLifeStatus === "alive"
                    ? getLocationName("woreda", parentDraft.motherWoredaId || "")
                    : undefined,
                kebeleId: parentDraft.motherLifeStatus === "alive" ? parentDraft.motherKebeleId || undefined : undefined,
                kebeleName:
                  parentDraft.motherLifeStatus === "alive"
                    ? getLocationName("kebele", parentDraft.motherKebeleId || "")
                    : undefined,
              },
            },
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { resident?: ResidentEditRecord; fieldErrors?: Record<string, string>; error?: string }
        | null;

      if (!response.ok) {
        if (payload?.fieldErrors) setFieldErrors(payload.fieldErrors);
        toast.error(payload?.error ?? "Failed to update resident.");
        return;
      }

      toast.success("Resident updated successfully.");
      router.push(`/residents/${editing.id}`);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell
      title="Edit Resident"
      description="Maintain resident identity, household, linkage, and administrative placement from a dedicated workspace."
      actions={
        <>
          <Link href={`/residents/${editing.id}`}>
            <Button variant="outline" className="h-9 rounded-none">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </Link>
          <Button className="h-9 rounded-none" onClick={() => void handleSave()} disabled={!canEdit || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </>
      }
    >
      <OpsPageIntro
        eyebrow="Resident Operations"
        title={`Editing ${editing.firstName} ${editing.fatherName} ${editing.grandFatherName}`}
        description="This editor keeps the resident context visible while you update record details, parent linkage, and administrative scope."
        links={[
          { label: "Resident Profile", href: `/residents/${editing.id}`, icon: UserRound },
          { label: "All Residents", href: "/residents", icon: Users },
          { label: "Register New", href: "/residents/new", icon: ShieldCheck },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <div className="space-y-4">
          <WorkspaceCard
            title="Identity and Contact"
            description="Core personal attributes used throughout the registry and verification flows."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="First Name" error={fieldErrors.firstName}><Input className="h-9 rounded-none" value={editing.firstName} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} /></Field>
              <Field label="Father Name" error={fieldErrors.fatherName}><Input className="h-9 rounded-none" value={editing.fatherName} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, fatherName: e.target.value })} /></Field>
              <Field label="Grand Father Name" error={fieldErrors.grandFatherName}><Input className="h-9 rounded-none" value={editing.grandFatherName} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, grandFatherName: e.target.value })} /></Field>
              <Field label="Date of Birth" error={fieldErrors.dateOfBirth}><Input className="h-9 rounded-none" type="date" value={editing.dateOfBirth} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, dateOfBirth: e.target.value })} /></Field>
              <Field label="Email" error={fieldErrors.email}><Input className="h-9 rounded-none" value={editing.email ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Phone"><Input className="h-9 rounded-none" value={editing.phoneNumber ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, phoneNumber: e.target.value })} /></Field>
              <Field label="Nationality"><Input className="h-9 rounded-none" value={editing.nationality} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, nationality: e.target.value })} /></Field>
              <Field label="Occupation"><Input className="h-9 rounded-none" value={editing.occupation ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, occupation: e.target.value })} /></Field>
              <Field label="Ethnicity"><Input className="h-9 rounded-none" value={editing.ethnicity ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, ethnicity: e.target.value })} /></Field>
              <Field label="Religion"><Input className="h-9 rounded-none" value={editing.religion ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, religion: e.target.value })} /></Field>
            </div>
          </WorkspaceCard>

          <WorkspaceCard
            title="Family Linkage"
            description="Maintain parent name parts and link them to existing resident records when possible."
          >
            <div className="mb-4 rounded-none border border-border/70 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
              Choose whether each parent is alive or deceased first. Resident lookup only appears for living parents and can be narrowed by zone, woreda, and kebele.
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Father First Name"><Input className="h-9 rounded-none" value={parentDraft.fatherFirstName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, fatherFirstName: e.target.value }))} onBlur={() => syncParentLinkByName("father")} /></Field>
              <Field label="Father Father Name"><Input className="h-9 rounded-none" value={parentDraft.fatherFatherName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, fatherFatherName: e.target.value }))} onBlur={() => syncParentLinkByName("father")} /></Field>
              <Field label="Father Grand Father Name"><Input className="h-9 rounded-none" value={parentDraft.fatherGrandFatherName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, fatherGrandFatherName: e.target.value }))} onBlur={() => syncParentLinkByName("father")} /></Field>
              <Field label="Father Status">
                <Select
                  value={parentDraft.fatherLifeStatus}
                  disabled={!canEdit}
                  onValueChange={(value) =>
                    setParentDraft((prev) => ({
                      ...prev,
                      fatherLifeStatus: value as ParentLifeStatus,
                      fatherZoneId: value === "alive" ? prev.fatherZoneId : "",
                      fatherWoredaId: value === "alive" ? prev.fatherWoredaId : "",
                      fatherKebeleId: value === "alive" ? prev.fatherKebeleId : "",
                    }))
                  }
                >
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alive">Alive</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {parentDraft.fatherLifeStatus === "alive" ? (
                <>
                  <Field label="Father Zone">
                    <Select
                      value={parentDraft.fatherZoneId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          fatherZoneId: value === "__none__" ? "" : value,
                          fatherWoredaId: "",
                          fatherKebeleId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Zones</SelectItem>
                        {geography.zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Father Woreda">
                    <Select
                      value={parentDraft.fatherWoredaId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          fatherWoredaId: value === "__none__" ? "" : value,
                          fatherKebeleId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Woredas</SelectItem>
                        {fatherAvailableWoredas.map((woreda) => <SelectItem key={woreda.id} value={woreda.id}>{woreda.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Father Kebele">
                    <Select
                      value={parentDraft.fatherKebeleId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          fatherKebeleId: value === "__none__" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Kebeles</SelectItem>
                        {fatherAvailableKebeles.map((kebele) => <SelectItem key={kebele.id} value={kebele.id}>{kebele.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="h-9 w-full rounded-none" disabled={!canEdit} onClick={() => syncParentLinkByName("father")}>
                      <Users className="mr-2 h-4 w-4" />
                      Auto-Link Father
                    </Button>
                  </div>
                </>
              ) : null}
              <Field label="Mother First Name"><Input className="h-9 rounded-none" value={parentDraft.motherFirstName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, motherFirstName: e.target.value }))} onBlur={() => syncParentLinkByName("mother")} /></Field>
              <Field label="Mother Father Name"><Input className="h-9 rounded-none" value={parentDraft.motherFatherName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, motherFatherName: e.target.value }))} onBlur={() => syncParentLinkByName("mother")} /></Field>
              <Field label="Mother Grand Father Name"><Input className="h-9 rounded-none" value={parentDraft.motherGrandFatherName} disabled={!canEdit} onChange={(e) => setParentDraft((prev) => ({ ...prev, motherGrandFatherName: e.target.value }))} onBlur={() => syncParentLinkByName("mother")} /></Field>
              <Field label="Mother Status">
                <Select
                  value={parentDraft.motherLifeStatus}
                  disabled={!canEdit}
                  onValueChange={(value) =>
                    setParentDraft((prev) => ({
                      ...prev,
                      motherLifeStatus: value as ParentLifeStatus,
                      motherZoneId: value === "alive" ? prev.motherZoneId : "",
                      motherWoredaId: value === "alive" ? prev.motherWoredaId : "",
                      motherKebeleId: value === "alive" ? prev.motherKebeleId : "",
                    }))
                  }
                >
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alive">Alive</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {parentDraft.motherLifeStatus === "alive" ? (
                <>
                  <Field label="Mother Zone">
                    <Select
                      value={parentDraft.motherZoneId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          motherZoneId: value === "__none__" ? "" : value,
                          motherWoredaId: "",
                          motherKebeleId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Zones</SelectItem>
                        {geography.zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Mother Woreda">
                    <Select
                      value={parentDraft.motherWoredaId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          motherWoredaId: value === "__none__" ? "" : value,
                          motherKebeleId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Woredas</SelectItem>
                        {motherAvailableWoredas.map((woreda) => <SelectItem key={woreda.id} value={woreda.id}>{woreda.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Mother Kebele">
                    <Select
                      value={parentDraft.motherKebeleId || "__none__"}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        setParentDraft((prev) => ({
                          ...prev,
                          motherKebeleId: value === "__none__" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">All Kebeles</SelectItem>
                        {motherAvailableKebeles.map((kebele) => <SelectItem key={kebele.id} value={kebele.id}>{kebele.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" className="h-9 w-full rounded-none" disabled={!canEdit} onClick={() => syncParentLinkByName("mother")}>
                      <HeartHandshake className="mr-2 h-4 w-4" />
                      Auto-Link Mother
                    </Button>
                  </div>
                </>
              ) : null}
              {parentDraft.fatherLifeStatus === "alive" ? (
                <Field label="Father Resident">
                  <Select
                    value={editing.fatherResidentId ?? "__none__"}
                    disabled={!canEdit}
                    onValueChange={(value) => {
                      const selectedId = value === "__none__" ? null : value;
                      const selectedResident = selectedId ? parentById.get(selectedId) : null;
                      setEditing({ ...editing, fatherResidentId: selectedId });
                      if (selectedResident) {
                        setParentDraft((prev) => ({
                          ...prev,
                          fatherFirstName: selectedResident.firstName,
                          fatherFatherName: selectedResident.fatherName,
                          fatherGrandFatherName: selectedResident.grandFatherName,
                          fatherZoneId: selectedResident.zoneId,
                          fatherWoredaId: selectedResident.woredaId,
                          fatherKebeleId: selectedResident.kebeleId,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {filteredFatherOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {parentDraft.motherLifeStatus === "alive" ? (
                <Field label="Mother Resident">
                  <Select
                    value={editing.motherResidentId ?? "__none__"}
                    disabled={!canEdit}
                    onValueChange={(value) => {
                      const selectedId = value === "__none__" ? null : value;
                      const selectedResident = selectedId ? parentById.get(selectedId) : null;
                      setEditing({
                        ...editing,
                        motherResidentId: selectedId,
                        motherName: selectedResident
                          ? `${selectedResident.firstName} ${selectedResident.fatherName} ${selectedResident.grandFatherName}`.trim()
                          : editing.motherName,
                      });
                      if (selectedResident) {
                        setParentDraft((prev) => ({
                          ...prev,
                          motherFirstName: selectedResident.firstName,
                          motherFatherName: selectedResident.fatherName,
                          motherGrandFatherName: selectedResident.grandFatherName,
                          motherZoneId: selectedResident.zoneId,
                          motherWoredaId: selectedResident.woredaId,
                          motherKebeleId: selectedResident.kebeleId,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {filteredMotherOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label="Mother Name (Derived)" className="xl:col-span-2">
                <Input className="h-9 rounded-none bg-muted/30" value={editing.motherName ?? ""} readOnly />
              </Field>
            </div>
          </WorkspaceCard>

          <WorkspaceCard
            title="Administrative and Status"
            description="Control household role and geographic placement inside the current registry scope."
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Household ID"><Input className="h-9 rounded-none" value={editing.householdId ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, householdId: e.target.value })} /></Field>
              <Field label="Household Role" error={fieldErrors.householdRole}>
                <Select value={editing.householdRole ?? ""} disabled={!canEdit} onValueChange={(value) => updateHouseholdRole(value as ResidentEditRecord["householdRole"])}>
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedHouseholdRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role[0].toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Gender">
                <Select value={editing.gender} disabled={!canEdit} onValueChange={(value) => setEditing({ ...editing, gender: value as Gender })}>
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marital Status">
                <Select value={editing.maritalStatus} disabled={!canEdit} onValueChange={(value) => updateMaritalStatus(value as ResidentEditRecord["maritalStatus"])}>
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {editing.householdRole && editing.householdRole !== "head" ? (
                <Field label="Family Head" error={fieldErrors.linkedHeadResidentId}>
                  <Select value={householdDraft.linkedHeadResidentId} disabled={!canEdit} onValueChange={updateLinkedHeadResident}>
                    <SelectTrigger className="h-9 rounded-none"><SelectValue placeholder="Select head of household" /></SelectTrigger>
                    <SelectContent>
                      {availableHeads.map((head) => (
                        <SelectItem key={head.id} value={head.id}>
                          {head.firstName} {head.fatherName} {head.grandFatherName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label="Zone" error={fieldErrors.zoneId}>
                <Select value={editing.zoneId} disabled={!canEdit} onValueChange={(value) => setEditing({ ...editing, zoneId: value, woredaId: "", kebeleId: "" })}>
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {geography.zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Woreda" error={fieldErrors.woredaId}>
                <Select value={editing.woredaId} disabled={!canEdit} onValueChange={(value) => setEditing({ ...editing, woredaId: value, kebeleId: "" })}>
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editAvailableWoredas.map((woreda) => <SelectItem key={woreda.id} value={woreda.id}>{woreda.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Kebele" error={fieldErrors.kebeleId}>
                <Select
                  value={editing.kebeleId}
                  disabled={!canEdit}
                  onValueChange={(value) =>
                    setEditing({
                      ...editing,
                      kebeleId: value,
                      kebeleName: geography.kebeles.find((kebele) => kebele.id === value)?.name ?? editing.kebeleName,
                    })
                  }
                >
                  <SelectTrigger className="h-9 rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editAvailableKebeles.map((kebele) => <SelectItem key={kebele.id} value={kebele.id}>{kebele.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {editing.householdRole === "child" ? (
                <Field label="Mother Name (Auto-linked)" className="md:col-span-2 xl:col-span-4">
                  <Input className="h-9 rounded-none" value={editing.motherName ?? ""} disabled={!canEdit} onChange={(e) => setEditing({ ...editing, motherName: e.target.value })} />
                </Field>
              ) : null}
              {editing.householdRole === "head" && editing.maritalStatus !== "single" ? (
                <>
                  <Field label="Spouse (If already registered)" className="md:col-span-2 xl:col-span-4">
                    <div className="space-y-2">
                      <Input
                        className="h-9 rounded-none"
                        value={spouseSearchQuery}
                        disabled={!canEdit}
                        onChange={(e) => setSpouseSearchQuery(e.target.value)}
                        placeholder="Search by first, father, or grand father name"
                      />
                      <div className="max-h-44 overflow-y-auto rounded-none border border-border/70 bg-muted/15">
                        {!spouseSearchQuery.trim() ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Start typing to search registered spouses.
                          </div>
                        ) : filteredSpouseOptions.length > 0 ? (
                          filteredSpouseOptions.map((resident) => (
                            <button
                              key={resident.id}
                              type="button"
                              className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                              disabled={!canEdit}
                              onClick={() => {
                                const fullName = `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.trim();
                                setHouseholdDraft((prev) => ({
                                  ...prev,
                                  spouseResidentId: resident.id,
                                  spouseFirstName: resident.firstName,
                                  spouseFatherName: resident.fatherName,
                                  spouseGrandFatherName: resident.grandFatherName,
                                }));
                                setSpouseSearchQuery(fullName);
                              }}
                            >
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background">
                                {resident.photoUrl ? (
                                  <img src={resident.photoUrl} alt={`${resident.firstName} ${resident.fatherName}`} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    {resident.firstName[0]}{resident.fatherName[0]}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                  {resident.firstName} {resident.fatherName} {resident.grandFatherName}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {resident.phoneNumber || "No phone number"}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No matching spouse found.</div>
                        )}
                      </div>
                      {householdDraft.spouseResidentId ? (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                          onClick={() => {
                            setHouseholdDraft((prev) => ({ ...prev, spouseResidentId: "" }));
                            setSpouseSearchQuery("");
                          }}
                        >
                          Clear selected registered spouse
                        </button>
                      ) : null}
                    </div>
                  </Field>
                  <Field label="Spouse First Name" error={fieldErrors.spouseFirstName} className="md:col-span-1 xl:col-span-1">
                    <Input className="h-9 rounded-none" value={householdDraft.spouseFirstName} disabled={!canEdit} onChange={(e) => setHouseholdDraft((prev) => ({ ...prev, spouseFirstName: e.target.value }))} />
                  </Field>
                  <Field label="Spouse Father Name" error={fieldErrors.spouseFatherName} className="md:col-span-1 xl:col-span-1">
                    <Input className="h-9 rounded-none" value={householdDraft.spouseFatherName} disabled={!canEdit} onChange={(e) => setHouseholdDraft((prev) => ({ ...prev, spouseFatherName: e.target.value }))} />
                  </Field>
                  <Field label="Spouse Grand Father Name" error={fieldErrors.spouseGrandFatherName} className="md:col-span-2 xl:col-span-1">
                    <Input className="h-9 rounded-none" value={householdDraft.spouseGrandFatherName} disabled={!canEdit} onChange={(e) => setHouseholdDraft((prev) => ({ ...prev, spouseGrandFatherName: e.target.value }))} />
                  </Field>
                  <Field label="Children Names" className="md:col-span-2 xl:col-span-4">
                    <textarea
                      className="min-h-28 w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      value={householdDraft.childrenNames}
                      disabled={!canEdit}
                      onChange={(e) => setHouseholdDraft((prev) => ({ ...prev, childrenNames: e.target.value }))}
                      placeholder="One child name per line"
                    />
                  </Field>
                  <Field label="Search Child (Optional)" className="md:col-span-2 xl:col-span-4">
                    <div className="space-y-2">
                      <Input
                        className="h-9 rounded-none"
                        value={childSearchQuery}
                        disabled={!canEdit}
                        onChange={(e) => setChildSearchQuery(e.target.value)}
                        placeholder="Search child by first, father, or grand father name"
                      />
                      {childSearchQuery.trim() ? (
                        <div className="max-h-40 overflow-y-auto rounded-none border border-border/70 bg-muted/15">
                          {filteredChildOptions.length > 0 ? (
                            filteredChildOptions.map((resident) => (
                              <button
                                key={resident.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b border-border/70 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40"
                                disabled={!canEdit}
                                onClick={() => {
                                  const names = householdDraft.childrenNames
                                    .split("\n")
                                    .map((name) => name.trim())
                                    .filter(Boolean);
                                  if (!names.includes(resident.firstName)) {
                                    setHouseholdDraft((prev) => ({
                                      ...prev,
                                      childrenNames: [...names, resident.firstName].join("\n"),
                                    }));
                                  }
                                  setChildSearchQuery("");
                                }}
                              >
                                <span>{resident.firstName} {resident.fatherName} {resident.grandFatherName}</span>
                                <span className="text-xs text-muted-foreground">Use first name</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matching child found.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                </>
              ) : null}
              {editing.householdRole === "head" ? (
                <>
                  <Field label="Relative First Name">
                    <Input className="h-9 rounded-none" value={relativeDraft.firstName} disabled={!canEdit} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, firstName: e.target.value }))} />
                  </Field>
                  <Field label="Relative Father Name">
                    <Input className="h-9 rounded-none" value={relativeDraft.fatherName} disabled={!canEdit} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, fatherName: e.target.value }))} />
                  </Field>
                  <Field label="Relative Grand Father Name">
                    <Input className="h-9 rounded-none" value={relativeDraft.grandFatherName} disabled={!canEdit} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, grandFatherName: e.target.value }))} />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-none"
                      disabled={!canEdit}
                      onClick={() => {
                        const entry = {
                          firstName: relativeDraft.firstName.trim(),
                          fatherName: relativeDraft.fatherName.trim(),
                          grandFatherName: relativeDraft.grandFatherName.trim(),
                        };
                        if (!entry.firstName || !entry.fatherName || !entry.grandFatherName) return;
                        setHouseholdDraft((prev) => ({ ...prev, relatives: [...prev.relatives, entry] }));
                        setRelativeDraft({ firstName: "", fatherName: "", grandFatherName: "" });
                      }}
                    >
                      Add Relative
                    </Button>
                  </div>
                  {householdDraft.relatives.length > 0 ? (
                    <Field label="Added Relatives" className="md:col-span-2 xl:col-span-4">
                      <div className="rounded-none border border-border/70 bg-muted/15">
                        {householdDraft.relatives.map((relative, index) => (
                          <div key={`${relative.firstName}-${relative.fatherName}-${relative.grandFatherName}-${index}`} className="flex items-center justify-between border-b border-border/70 px-3 py-2 text-sm last:border-b-0">
                            <span>{relative.firstName} {relative.fatherName} {relative.grandFatherName}</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={() => setHouseholdDraft((prev) => ({ ...prev, relatives: prev.relatives.filter((_, itemIndex) => itemIndex !== index) }))}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>
          </WorkspaceCard>
        </div>

        <div className="space-y-4">
          <WorkspaceCard title="Resident Snapshot" description="Live reference while editing the record.">
            <div className="space-y-4">
              <div className="flex items-start gap-3 border border-border/70 bg-muted/25 p-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-border/70 bg-background">
                  {editing.photoUrl ? (
                    <img src={editing.photoUrl} alt="Resident" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{editing.firstName} {editing.fatherName} {editing.grandFatherName}</p>
                  <p className="text-sm text-muted-foreground">{editing.kebeleName}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className="rounded-none">{getStatusBadge(editing.status)}</div>
                  </div>
                </div>
              </div>
              <Field label="Upload Photo">
                <Input className="h-9 rounded-none" type="file" accept="image/*" disabled={!canEdit} onChange={(e) => void onPhotoChange(e.target.files?.[0] ?? null)} />
              </Field>
              <div>
                <Label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Preview</Label>
                <div className="mt-2 flex h-72 items-center justify-center overflow-hidden border border-border/70 bg-muted/20">
                  {editing.photoUrl ? (
                    <img src={editing.photoUrl} alt="Resident" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                      <Camera className="h-5 w-5" />
                      No photo uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Record Guidance" description="Checks and context tied to this update.">
            <div className="space-y-3 text-sm text-muted-foreground">
              <InfoRow icon={ShieldCheck} title="Validation">
                Required identity and location fields are checked both in the browser and on the API.
              </InfoRow>
              <InfoRow icon={HeartHandshake} title="Parent Links">
                Auto-link uses exact three-part name matching against existing residents.
              </InfoRow>
              <InfoRow icon={MapPinned} title="Administrative Scope">
                Changing zone or woreda narrows the kebele options immediately.
              </InfoRow>
            </div>
          </WorkspaceCard>

          <WorkspaceCard title="Quick Navigation" description="Jump directly to related pages for this resident.">
            <div className="space-y-2">
              <Link href={`/residents/${editing.id}`} className="flex items-center justify-between border border-border/70 px-3 py-2 text-sm hover:bg-muted/40">
                <span>Open resident profile</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
              <Link href="/residents" className="flex items-center justify-between border border-border/70 px-3 py-2 text-sm hover:bg-muted/40">
                <span>Return to resident directory</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
              {editing.householdId ? (
                <Link href={`/households/${editing.householdId}`} className="flex items-center justify-between border border-border/70 px-3 py-2 text-sm hover:bg-muted/40">
                  <span>Open linked household</span>
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Link>
              ) : null}
            </div>
          </WorkspaceCard>
        </div>
      </div>
    </PageShell>
  );
}

function Field({
  label,
  error,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-border/70 bg-muted/20 px-3 py-3">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
