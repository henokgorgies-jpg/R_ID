import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Phone,
  PencilLine,
  User,
  ShieldCheck,
  Users,
  FileCheck,
  Briefcase,
  HeartHandshake,
  GitBranchPlus,
} from "lucide-react";
import { db } from "@/lib/db";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResidentDetailActions } from "@/components/residents/resident-detail-actions";

type StoredParentReference = {
  firstName?: string;
  fatherName?: string;
  grandFatherName?: string;
  lifeStatus?: "alive" | "deceased";
  zoneName?: string;
  woredaName?: string;
  kebeleName?: string;
};

type StoredSpouseReference = {
  spouseName?: string;
  spouseResidentId?: string;
  spouseNameParts?: {
    firstName?: string;
    fatherName?: string;
    grandFatherName?: string;
  };
  childrenNames?: string[];
  relatives?: Array<{
    firstName?: string;
    fatherName?: string;
    grandFatherName?: string;
  }>;
};

function splitStoredNameParts(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  return {
    firstName: parts[0] ?? "",
    fatherName: parts[1] ?? "",
    grandFatherName: parts.slice(2).join(" "),
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toISOString().slice(0, 10);
}

type RelativeNode = {
  id?: string;
  firstName: string;
  fatherName: string;
  grandFatherName: string;
  gender: string;
  dateOfBirth?: Date | null;
  idNumber?: string | null;
  status: string;
  maritalStatus?: string;
  locationLabel?: string | null;
};

function RelativeTreeNode({
  person,
  relation,
  highlight = false,
}: {
  person: RelativeNode;
  relation: string;
  highlight?: boolean;
}) {
  const content = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{relation}</p>
      <p className="mt-1 truncate font-semibold">
        {person.firstName} {person.fatherName} {person.grandFatherName}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {person.gender} {person.dateOfBirth ? `· ${formatDate(person.dateOfBirth)}` : ""}
      </p>
      <p className="text-xs text-muted-foreground">
        {person.idNumber ?? "ID Pending"} · {person.status}
      </p>
      {person.locationLabel ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{person.locationLabel}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-1">
        {person.status === "deceased" && (
          <span className="rounded-none border border-rose-300/80 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-rose-800">
            Deceased
          </span>
        )}
        {(person.maritalStatus === "divorced" || person.maritalStatus === "widowed" || person.maritalStatus === "separated") && (
          <span className="rounded-none border border-amber-300/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-800">
            {person.maritalStatus}
          </span>
        )}
      </div>
    </>
  );

  const className = `block rounded-none border px-3 py-2 transition-colors ${
    highlight ? "border-sky-300/80 bg-sky-50/70" : "border-border/70 bg-card/80"
  } ${person.id ? "hover:bg-muted/60" : ""}`;

  if (person.id) {
    return (
      <Link href={`/residents/${person.id}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export default async function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resident = await db.resident.findUnique({
    where: { id },
    include: {
      kebele: true,
      woreda: true,
      zone: true,
      registeredByUser: true,
    },
  });

  if (!resident) notFound();

  const storedFather = ((resident.address as { parentNameParts?: { father?: StoredParentReference; mother?: StoredParentReference } } | null)?.parentNameParts?.father ?? null);
  const storedMother = ((resident.address as { parentNameParts?: { father?: StoredParentReference; mother?: StoredParentReference } } | null)?.parentNameParts?.mother ?? null);
  const storedSpouse = (resident.address as StoredSpouseReference | null) ?? null;

  const [father, mother, spouseResident, householdHead, householdMembers, directChildren, householdChildren] = await Promise.all([
    resident.fatherResidentId
      ? db.resident.findUnique({
          where: { id: resident.fatherResidentId },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            dateOfBirth: true,
            phoneNumber: true,
            idNumber: true,
            status: true,
            maritalStatus: true,
          },
        })
      : Promise.resolve(null),
    resident.motherResidentId
      ? db.resident.findUnique({
          where: { id: resident.motherResidentId },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            dateOfBirth: true,
            phoneNumber: true,
            idNumber: true,
            status: true,
            maritalStatus: true,
          },
        })
      : Promise.resolve(null),
    resident.householdId && resident.maritalStatus !== "single"
      ? db.resident.findFirst({
          where: {
            householdId: resident.householdId,
            NOT: { id: resident.id },
            OR:
              resident.householdRole === "head"
                ? [{ householdRole: "spouse" }]
                : resident.householdRole === "spouse"
                  ? [{ householdRole: "head" }]
                  : [{ id: storedSpouse?.spouseResidentId ?? "__none__" }],
          },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            dateOfBirth: true,
            phoneNumber: true,
            idNumber: true,
            status: true,
            maritalStatus: true,
          },
        })
      : Promise.resolve(null),
    resident.householdId && resident.householdRole === "spouse"
      ? db.resident.findFirst({
          where: {
            householdId: resident.householdId,
            householdRole: "head",
          },
          select: {
            id: true,
            address: true,
          },
        })
      : Promise.resolve(null),
    resident.householdId
      ? db.resident.findMany({
          where: { householdId: resident.householdId, NOT: { id: resident.id } },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            dateOfBirth: true,
            phoneNumber: true,
            idNumber: true,
            householdRole: true,
            status: true,
            maritalStatus: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    db.resident.findMany({
      where: {
        id: { not: resident.id },
        OR: [
          { fatherResidentId: resident.id },
          { motherResidentId: resident.id },
        ],
      },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        gender: true,
        dateOfBirth: true,
        phoneNumber: true,
        idNumber: true,
        status: true,
        householdRole: true,
        maritalStatus: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    resident.householdId && (resident.householdRole === "head" || resident.householdRole === "spouse")
      ? db.resident.findMany({
          where: {
            id: { not: resident.id },
            householdId: resident.householdId,
            householdRole: "child",
          },
          select: {
            id: true,
            firstName: true,
            fatherName: true,
            grandFatherName: true,
            gender: true,
            dateOfBirth: true,
            phoneNumber: true,
            idNumber: true,
            status: true,
            householdRole: true,
            maritalStatus: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const children = [
    ...directChildren,
    ...householdChildren.filter(
      (child) => !directChildren.some((directChild) => directChild.id === child.id),
    ),
  ];

  const fatherFallback = !father && storedFather?.firstName
    ? {
        firstName: storedFather.firstName,
        fatherName: storedFather.fatherName ?? "",
        grandFatherName: storedFather.grandFatherName ?? "",
        gender: "male",
        dateOfBirth: null,
        idNumber: null,
        status: storedFather.lifeStatus === "deceased" ? "deceased" : "record not linked",
        locationLabel: [storedFather.kebeleName, storedFather.woredaName, storedFather.zoneName].filter(Boolean).join(", ") || null,
      }
    : null;
  const motherFallback = !mother && storedMother?.firstName
    ? {
        firstName: storedMother.firstName,
        fatherName: storedMother.fatherName ?? "",
        grandFatherName: storedMother.grandFatherName ?? "",
        gender: "female",
        dateOfBirth: null,
        idNumber: null,
        status: storedMother.lifeStatus === "deceased" ? "deceased" : "record not linked",
        locationLabel: [storedMother.kebeleName, storedMother.woredaName, storedMother.zoneName].filter(Boolean).join(", ") || null,
      }
    : null;
  const spouseFallback = !spouseResident && resident.maritalStatus !== "single" && storedSpouse?.spouseNameParts?.firstName
    ? {
        firstName: storedSpouse.spouseNameParts.firstName,
        fatherName: storedSpouse.spouseNameParts.fatherName ?? "",
        grandFatherName: storedSpouse.spouseNameParts.grandFatherName ?? "",
        gender: resident.gender === "male" ? "female" : "male",
        dateOfBirth: null,
        idNumber: null,
        status: "record not linked",
        maritalStatus: resident.maritalStatus,
      }
    : null;
  const headStoredSpouse =
    householdHead?.address && typeof householdHead.address === "object" && !Array.isArray(householdHead.address)
      ? (householdHead.address as StoredSpouseReference)
      : null;
  const rawInferredChildNames =
    resident.householdRole === "head"
      ? Array.isArray(storedSpouse?.childrenNames)
        ? storedSpouse.childrenNames
        : []
      : resident.householdRole === "spouse"
        ? Array.isArray(headStoredSpouse?.childrenNames)
          ? headStoredSpouse.childrenNames
          : []
        : [];
  const inferredChildren = rawInferredChildNames
    .map((childName) => childName.trim())
    .filter(Boolean)
    .map((childName) => {
      const parsed = splitStoredNameParts(childName);
      return {
        id: undefined,
        firstName: parsed?.firstName || childName,
        fatherName: parsed?.fatherName || "",
        grandFatherName: parsed?.grandFatherName || "",
        gender: "unknown",
        dateOfBirth: null,
        idNumber: null,
        householdRole: "child",
        status: "name only",
      };
    });
  const linkedChildKeys = new Set(
    children.map((child) => `${child.firstName} ${child.fatherName} ${child.grandFatherName}`.trim().toLowerCase()),
  );
  const graphChildren = [
    ...children,
    ...inferredChildren.filter(
      (child) => !linkedChildKeys.has(`${child.firstName} ${child.fatherName} ${child.grandFatherName}`.trim().toLowerCase()),
    ),
  ];
  const householdMemberKeys = new Set(
    householdMembers.map((member) => `${member.firstName} ${member.fatherName} ${member.grandFatherName}`.trim().toLowerCase()),
  );
  const nameOnlyHouseholdChildren = inferredChildren.filter(
    (child) => !householdMemberKeys.has(`${child.firstName} ${child.fatherName} ${child.grandFatherName}`.trim().toLowerCase()),
  );
  const graphRelatives =
    resident.householdRole === "head" && Array.isArray(storedSpouse?.relatives)
      ? storedSpouse.relatives
          .map((relative) => ({
            id: undefined,
            firstName: relative.firstName ?? "",
            fatherName: relative.fatherName ?? "",
            grandFatherName: relative.grandFatherName ?? "",
            gender: "relative",
            dateOfBirth: null,
            idNumber: null,
            status: "name only",
          }))
          .filter((relative) => relative.firstName && relative.fatherName && relative.grandFatherName)
      : [];

  return (
    <PageShell
      title={`${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`}
      description={resident.idNumber ?? "ID Pending"}
      actions={
        <>
          <Link href={`/residents/${resident.id}/edit`}>
            <Button className="h-9 rounded-none">
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Resident
            </Button>
          </Link>
          <Link href="/residents">
            <Button variant="outline" className="h-9 rounded-none">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Residents
            </Button>
          </Link>
        </>
      }
    >
      <Card className="rounded-none border-border/70">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-none border border-sky-300/80 bg-sky-50 text-lg font-semibold text-sky-800">
                {resident.firstName[0]}
                {resident.fatherName[0]}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-xl font-semibold tracking-[-0.02em]">
                  {resident.firstName} {resident.fatherName} {resident.grandFatherName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  Resident #{resident.id} {resident.idNumber ? `· ${resident.idNumber}` : "· ID Pending"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={resident.status === "active" ? "default" : "secondary"}
                className="rounded-none border border-border/70 px-2.5 py-0.5 capitalize"
              >
                Status: {resident.status}
              </Badge>
              <Badge variant="outline" className="rounded-none px-2.5 py-0.5 capitalize">
                Gender: {resident.gender}
              </Badge>
              <Badge variant="outline" className="rounded-none px-2.5 py-0.5">
                DOB: {formatDate(resident.dateOfBirth)}
              </Badge>
            </div>
          </div>
          <ResidentDetailActions
            residentId={resident.id}
            householdId={resident.householdId}
            fullName={`${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`}
            idNumber={resident.idNumber}
            status={resident.status}
            phoneNumber={resident.phoneNumber}
            email={resident.email}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Identity</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold">{resident.idNumber ? "Issued" : "Pending"}</p>
              <User className="h-4 w-4 text-sky-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Civil Status</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold capitalize">{resident.maritalStatus}</p>
              <HeartHandshake className="h-4 w-4 text-emerald-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Household</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold">{resident.householdId ? "Linked" : "Unlinked"}</p>
              <Users className="h-4 w-4 text-amber-700" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-border/70">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Record</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-lg font-semibold capitalize">{resident.status}</p>
              <FileCheck className="h-4 w-4 text-indigo-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-none border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={resident.status === "active" ? "default" : "secondary"} className="rounded-none capitalize">
                {resident.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Gender</span>
              <span className="capitalize">{resident.gender}</span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(resident.dateOfBirth)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Nationality</span>
              <span>{resident.nationality}</span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Marital Status</span>
              <span className="capitalize">{resident.maritalStatus}</span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Occupation</span>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {resident.occupation ?? "Not specified"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact and Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Phone</span>
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {resident.phoneNumber ? (
                  <a href={`tel:${resident.phoneNumber}`} className="font-medium hover:underline">
                    {resident.phoneNumber}
                  </a>
                ) : (
                  "Not provided"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <span className="text-muted-foreground">Email</span>
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {resident.email ? (
                  <a href={`mailto:${resident.email}`} className="font-medium hover:underline">
                    {resident.email}
                  </a>
                ) : (
                  "Not provided"
                )}
              </span>
            </div>
            <div className="rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Administrative Address</p>
              <p className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {resident.kebele.name}, {resident.woreda.name}, {resident.zone.name}
              </p>
            </div>
            <div className="rounded-none border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-muted-foreground">Registry Tracking</p>
              <p className="mt-1">
                Registered by <span className="font-medium">{resident.registeredByUser.firstName} {resident.registeredByUser.lastName}</span>
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Registration Date: {formatDate(resident.registrationDate)}
              </p>
              <p className="mt-0.5 text-muted-foreground">
                ID Workflow: <span className="font-medium">{resident.idNumber ? "Issued" : "Pending"}</span>
                <ShieldCheck className="ml-1 inline h-3.5 w-3.5" />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranchPlus className="h-4 w-4 text-sky-700" />
            Relatives and Linked Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-none border border-border/70 bg-gradient-to-b from-sky-50/40 to-background p-4">
            <p className="mb-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Family Tree Graph</p>
            <div
              className="max-h-[38rem] overflow-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              <div className="mx-auto min-w-[760px] max-w-5xl">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    {father ? (
                      <RelativeTreeNode person={father} relation="Father" />
                    ) : fatherFallback ? (
                      <RelativeTreeNode person={fatherFallback} relation="Father" />
                    ) : (
                      <div className="rounded-none border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Father link not provided
                      </div>
                    )}
                  </div>
                  <div>
                    {mother ? (
                      <RelativeTreeNode person={mother} relation="Mother" />
                    ) : motherFallback ? (
                      <RelativeTreeNode person={motherFallback} relation="Mother" />
                    ) : (
                      <div className="rounded-none border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Mother link not provided
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-col items-center">
                  <div className="h-5 w-[65%] border-x border-t border-border/70" />
                  <div className="h-4 w-px bg-border/80" />
                </div>

                <div className={`mx-auto ${spouseResident || spouseFallback ? "grid max-w-3xl gap-4 md:grid-cols-2" : "max-w-sm"}`}>
                  <RelativeTreeNode
                    person={{
                      id: resident.id,
                      firstName: resident.firstName,
                      fatherName: resident.fatherName,
                      grandFatherName: resident.grandFatherName,
                      gender: resident.gender,
                      dateOfBirth: resident.dateOfBirth,
                      idNumber: resident.idNumber,
                      status: resident.status,
                      maritalStatus: resident.maritalStatus,
                    }}
                    relation="Current Resident"
                    highlight
                  />
                  {spouseResident ? (
                    <RelativeTreeNode
                      person={spouseResident}
                      relation={
                        resident.maritalStatus === "married"
                          ? "Spouse"
                          : resident.maritalStatus === "widowed"
                            ? "Late Spouse"
                            : "Former Spouse"
                      }
                    />
                  ) : spouseFallback ? (
                    <RelativeTreeNode
                      person={spouseFallback}
                      relation={
                        resident.maritalStatus === "married"
                          ? "Spouse"
                          : resident.maritalStatus === "widowed"
                            ? "Late Spouse"
                            : "Former Spouse"
                      }
                    />
                  ) : null}
                </div>

                <div className="mt-2 flex flex-col items-center">
                  <div className="h-4 w-px bg-border/80" />
                  {graphChildren.length > 0 && <div className="h-5 w-[80%] border-x border-t border-border/70" />}
                </div>

                {graphChildren.length > 0 || graphRelatives.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {graphChildren.map((child, index) => (
                      <RelativeTreeNode key={child.id ?? `child-name-${index}`} person={child} relation="Child" />
                    ))}
                    {graphRelatives.map((relative, index) => (
                      <RelativeTreeNode key={`relative-name-${index}`} person={relative} relation="Relative" />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-none border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
                    No children or relatives linked through household records
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-none border border-border/70">
            <div className="border-b border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">Household Relatives ({householdMembers.length + nameOnlyHouseholdChildren.length})</p>
            </div>
            {householdMembers.length === 0 && nameOnlyHouseholdChildren.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No household-linked relatives found.</p>
            ) : (
              <div className="divide-y divide-border/70">
                {householdMembers.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        <Link href={`/residents/${member.id}`} className="hover:underline">
                          {member.firstName} {member.fatherName} {member.grandFatherName}
                        </Link>
                      </p>
                      <p className="text-muted-foreground">
                        Role: {member.householdRole ?? "member"} · Gender: {member.gender} · DOB: {formatDate(member.dateOfBirth)}
                      </p>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <p>ID: {member.idNumber ?? "Pending"}</p>
                      <p>Status: {member.status}</p>
                    </div>
                  </div>
                ))}
                {nameOnlyHouseholdChildren.map((child, index) => (
                  <div key={`name-only-household-child-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {child.firstName} {child.fatherName} {child.grandFatherName}
                      </p>
                      <p className="text-muted-foreground">
                        Role: child · Gender: unknown · DOB: Not available
                      </p>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <p>ID: Pending</p>
                      <p>Status: name only</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-none border border-border/70">
            <div className="border-b border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">Children Linked to This Resident ({graphChildren.length})</p>
            </div>
            {graphChildren.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No children are linked through parent references or household notes.</p>
            ) : (
              <div className="divide-y divide-border/70">
                {graphChildren.map((child, index) => (
                  <div key={child.id ?? `graph-child-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {child.id ? (
                          <Link href={`/residents/${child.id}`} className="hover:underline">
                            {child.firstName} {child.fatherName} {child.grandFatherName}
                          </Link>
                        ) : (
                          <span>{child.firstName} {child.fatherName} {child.grandFatherName}</span>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        Role: {child.householdRole ?? "member"} · Gender: {child.gender} · DOB: {formatDate(child.dateOfBirth)}
                      </p>
                    </div>
                    <div className="text-right text-muted-foreground">
                      <p>ID: {child.idNumber ?? "Pending"}</p>
                      <p>Status: {child.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
