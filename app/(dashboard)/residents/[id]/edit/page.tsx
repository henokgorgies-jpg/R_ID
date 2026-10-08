import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ResidentEditPage, type ResidentEditRecord } from "@/components/residents/resident-edit-page";

function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default async function ResidentEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [resident, zones, woredas, kebeles, parentResidents] = await Promise.all([
    db.resident.findUnique({
      where: { id },
      include: {
        kebele: true,
      },
    }),
    db.zone.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.woreda.findMany({
      orderBy: { name: "asc" },
      select: { id: true, zoneId: true, name: true },
    }),
    db.kebele.findMany({
      orderBy: { name: "asc" },
      select: { id: true, woredaId: true, name: true },
    }),
    db.resident.findMany({
      where: { NOT: { id } },
      orderBy: [{ firstName: "asc" }, { fatherName: "asc" }, { grandFatherName: "asc" }],
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        photoUrl: true,
        phoneNumber: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
        householdId: true,
        householdRole: true,
        gender: true,
        maritalStatus: true,
        address: true,
      },
    }),
  ]);

  if (!resident) notFound();

  const initialResident: ResidentEditRecord = {
    id: resident.id,
    firstName: resident.firstName,
    fatherName: resident.fatherName,
    grandFatherName: resident.grandFatherName,
    dateOfBirth: formatDateInput(resident.dateOfBirth),
    gender: resident.gender,
    maritalStatus: resident.maritalStatus,
    nationality: resident.nationality,
    ethnicity: resident.ethnicity,
    religion: resident.religion,
    occupation: resident.occupation,
    email: resident.email,
    phoneNumber: resident.phoneNumber,
    zoneId: resident.zoneId,
    woredaId: resident.woredaId,
    kebeleId: resident.kebeleId,
    kebeleName: resident.kebele.name,
    householdId: resident.householdId,
    householdRole: resident.householdRole,
    motherName: resident.motherName,
    fatherResidentId: resident.fatherResidentId,
    motherResidentId: resident.motherResidentId,
    photoUrl: resident.photoUrl,
    status: resident.status,
    idStatus: resident.idStatus,
    address: (resident.address as ResidentEditRecord["address"]) ?? undefined,
  };

  return (
    <ResidentEditPage
      initialResident={initialResident}
      geography={{ zones, woredas, kebeles }}
      parentResidents={parentResidents}
    />
  );
}
