import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"

type StoredSpouseReference = {
  childrenNames?: string[]
}

function splitStoredNameParts(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return null
  return {
    firstName: parts[0] ?? "",
    fatherName: parts[1] ?? "",
    grandFatherName: parts.slice(2).join(" "),
  }
}

function extractChildrenNames(address: unknown): string[] {
  if (!address || typeof address !== "object" || Array.isArray(address)) return []
  const stored = address as StoredSpouseReference
  if (!Array.isArray(stored.childrenNames)) return []
  return stored.childrenNames
    .map((childName) => childName.trim())
    .filter(Boolean)
}

export default async function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const household = await db.household.findUnique({
    where: { id },
    include: {
      kebele: true,
      woreda: true,
      zone: true,
      residents: true,
    },
  })
  if (!household) notFound()
  const head = household.residents.find((r: any) => r.id === household.headResidentId)
  const spouses = household.residents.filter((r: any) => r.householdRole === "spouse")
  const children = household.residents.filter((r: any) => r.householdRole === "child")
  const relatives = household.residents.filter((r: any) => r.householdRole === "relative")
  const registeredChildKeys = new Set(
    children.map((child: any) => `${child.firstName} ${child.fatherName} ${child.grandFatherName}`.trim().toLowerCase()),
  )
  const rawInferredChildNames = household.residents
    .filter((r: any) => r.householdRole === "head" || r.householdRole === "spouse")
    .flatMap((r: any) => extractChildrenNames(r.address))
  const uniqueInferredChildNames = Array.from(new Set(rawInferredChildNames.map((name) => name.toLowerCase())))
  const nameOnlyChildren = uniqueInferredChildNames
    .filter((normalizedName) => !registeredChildKeys.has(normalizedName))
    .map((normalizedName) => {
      const originalName = rawInferredChildNames.find((name) => name.toLowerCase() === normalizedName) ?? normalizedName
      const parsed = splitStoredNameParts(originalName)
      return {
        firstName: parsed?.firstName || originalName,
        fatherName: parsed?.fatherName || "",
        grandFatherName: parsed?.grandFatherName || "",
      }
    })
  const timeline = [...household.residents].sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))

  return (
    <PageShell
      title={`Household ${household.id}`}
      description={`${household.kebele.name}, ${household.woreda.name}`}
      actions={
        <Link href="/households">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <WorkspaceCard title="Head">
          <p className="font-medium">{head ? `${head.firstName} ${head.fatherName}` : "Not linked"}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Spouses">
          <p className="text-2xl font-semibold">{spouses.length}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Children">
          <p className="text-2xl font-semibold">{children.length + nameOnlyChildren.length}</p>
        </WorkspaceCard>
        <WorkspaceCard title="Relatives">
          <p className="text-2xl font-semibold">{relatives.length}</p>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="Members" description={`${household.residents.length} registered residents`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {household.residents.map((r: any) => (
              <TableRow key={r.id}>
              <TableCell>{r.firstName} {r.fatherName} {r.grandFatherName}</TableCell>
                <TableCell><Badge variant="outline">{r.householdRole ?? "member"}</Badge></TableCell>
                <TableCell className="capitalize">{r.gender}</TableCell>
                <TableCell>{r.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WorkspaceCard>

      <WorkspaceCard title="Name-Only Children" description="Children saved in household notes but not yet registered as resident records">
        {nameOnlyChildren.length === 0 ? (
          <p className="text-sm text-muted-foreground">No name-only children found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nameOnlyChildren.map((child, index) => (
                <TableRow key={`name-only-child-${index}`}>
                  <TableCell>{child.firstName} {child.fatherName} {child.grandFatherName}</TableCell>
                  <TableCell><Badge variant="outline">child</Badge></TableCell>
                  <TableCell className="capitalize">unknown</TableCell>
                  <TableCell>ID Pending · name only</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </WorkspaceCard>

      <WorkspaceCard title="Member Timeline" description="Joined household chronology">
        <div className="space-y-2">
          {timeline.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border p-3">
              <div>
                <p className="font-medium">{r.firstName} {r.fatherName} {r.grandFatherName}</p>
                <p className="text-sm text-muted-foreground">Role: {r.householdRole ?? "member"}</p>
              </div>
              <p className="text-sm text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </WorkspaceCard>
    </PageShell>
  )
}
