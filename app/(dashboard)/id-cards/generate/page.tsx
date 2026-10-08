"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles, ArrowLeft, Download, ShieldCheck, ChevronLeft, ChevronRight, Eye, Circle, CircleDot } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { generateID } from "@/lib/id-system/id-generator"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Resident = {
  id: string
  firstName: string
  fatherName: string
  grandFatherName: string
  kebeleId: string
  kebeleName: string
  zoneId: string
  dateOfBirth: string
  gender: "male" | "female"
  status: string
  ethnicity?: string | null
  maritalStatus?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  occupation?: string | null
  nationality?: string | null
  religion?: string | null
  phoneNumber?: string | null
  photoUrl?: string | null
  idNumber?: string | null
  idStatus?: string | null
  idIssuedDate?: string | null
  idExpiryDate?: string | null
  qrToken?: string | null
  address?: { city?: string; street?: string; houseNumber?: string }
}

type Woreda = { id: string; code: string; name: string }
type Kebele = { id: string; code: string; zoneId: string; woredaId: string; name: string }
type Zone = { id: string; code: string; name: string }
const ITEMS_PER_PAGE = 10

function toTwoDigitCode(value: string | undefined): string {
  if (!value) return "01"
  const digits = value.replace(/\D/g, "")
  if (!digits) return "01"
  const n = Number.parseInt(digits.slice(-3), 10)
  if (!Number.isFinite(n)) return "01"
  return String(Math.max(1, n % 100 || n)).padStart(2, "0").slice(-2)
}

export default function GenerateIdPage() {
  const [query, setQuery] = useState("")
  const [residents, setResidents] = useState<Resident[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [kebeles, setKebeles] = useState<Kebele[]>([])
  const [selected, setSelected] = useState<Resident | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSide, setPreviewSide] = useState<1 | 2>(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentResidentId, setPaymentResidentId] = useState<string | null>(null)
  const [isChargingPayment, setIsChargingPayment] = useState(false)
  const [pendingPaymentRefs, setPendingPaymentRefs] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const [resResidents, resGeo] = await Promise.all([
        fetch("/api/residents", { cache: "no-store" }),
        fetch("/api/geography", { cache: "no-store" }),
      ])
      if (resResidents.ok) {
        const data = await resResidents.json()
        setResidents(data.residents ?? [])
      }
      if (resGeo.ok) {
        const data = await resGeo.json()
        setWoredas(data.woredas ?? [])
        setKebeles(data.kebeles ?? [])
        setZones(data.zones ?? [])
      }
    }
    void load()
  }, [])

  const pendingResidents = useMemo(
    () =>
      residents.filter(
        (r) =>
          r.status === "active" &&
          (!r.idNumber || r.idNumber.trim().length === 0),
      ),
    [residents],
  )

  const filtered = useMemo(() => {
    return pendingResidents.filter((r) => {
      if (!query) return true
      const q = query.toLowerCase()
      return (
        r.firstName.toLowerCase().includes(q) ||
        r.fatherName.toLowerCase().includes(q) ||
        r.grandFatherName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      )
    })
  }, [pendingResidents, query])

  useEffect(() => {
    setCurrentPage(1)
  }, [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const pageRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const issueWithReference = async (resident: Resident, paymentReference: string) => {
    const kebele = kebeles.find((k) => k.id === resident.kebeleId)
    if (!kebele) {
      toast.error("Kebele metadata not found")
      return false
    }

    const woreda = woredas.find((w) => w.id === kebele.woredaId)
    if (!woreda) {
      toast.error("Woreda metadata not found")
      return false
    }
    const zone = zones.find((z) => z.id === kebele.zoneId)
    if (!zone) {
      toast.error("Zone metadata not found")
      return false
    }

    const output = generateID({
      zoneCode: toTwoDigitCode(zone.code),
      woredaCode: toTwoDigitCode(woreda.code),
      kebeleCode: toTwoDigitCode(kebele.code),
      kebeleId: kebele.id,
    })

    const issuedDate = new Date().toISOString().slice(0, 10)
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 5)
    const idExpiryDate = expiry.toISOString().slice(0, 10)

    const res = await fetch(`/api/residents/${resident.id}/issue-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idNumber: output.idNumber,
        idIssuedDate: issuedDate,
        idExpiryDate,
        paymentReference,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      toast.error(err?.error ?? "Failed to generate ID card")
      return false
    }

    const issued = await res.json()
    const updated = {
      ...resident,
      idNumber: output.idNumber,
      idStatus: "active",
      idIssuedDate: issuedDate,
      idExpiryDate,
      qrToken: issued?.qrToken ?? null,
    }
    setSelected(updated)
    setPreviewSide(1)
    setPreviewOpen(true)
    setResidents((prev) => prev.map((r) => (r.id === resident.id ? updated : r)))
    setPendingPaymentRefs((prev) => {
      const next = { ...prev }
      delete next[resident.id]
      return next
    })
    toast.success("ID card generated")
    return true
  }

  const generateForResident = async (residentId: string) => {
    const resident = residents.find((r) => r.id === residentId)
    if (!resident) {
      toast.error("Resident not found")
      return
    }

    const pendingRef = pendingPaymentRefs[residentId]
    if (pendingRef) {
      const ok = await issueWithReference(resident, pendingRef)
      if (!ok) {
        toast.error("Previous payment is still available. Retry Generate to reuse it or start a new payment.")
      }
      return
    }

    setPaymentResidentId(residentId)
    await handleSubmitPayment(residentId)
  }

  const handleSubmitPayment = async (residentId?: string) => {
    const targetResidentId = residentId ?? paymentResidentId
    if (!targetResidentId) return
    const resident = residents.find((r) => r.id === targetResidentId)
    if (!resident) {
      toast.error("Resident not found")
      return
    }

    setIsChargingPayment(true)
    const chargeRes = await fetch("/api/payments/ethiopay/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentId: resident.id,
        mode: "initial_issue",
      }),
    })
    if (!chargeRes.ok) {
      const err = await chargeRes.json().catch(() => null)
      toast.error(err?.error ?? "EthioPay payment failed")
      setIsChargingPayment(false)
      return
    }
    const chargePayload = await chargeRes.json().catch(() => null)
    const paymentReference = chargePayload?.transaction?.transactionRef as string | undefined
    if (!paymentReference) {
      toast.error("Payment succeeded but transaction reference is missing")
      setIsChargingPayment(false)
      return
    }

    setPendingPaymentRefs((prev) => ({ ...prev, [resident.id]: paymentReference }))
    const ok = await issueWithReference(resident, paymentReference)
    if (ok) {
      setPaymentResidentId(null)
    } else {
      toast.error("Payment captured. Retry Generate to finalize issuance without charging again.")
    }
    setIsChargingPayment(false)
  }

  const selectedZone = zones.find((z) => z.id === selected?.zoneId)

  return (
    <PageShell
      title="Generate ID"
      hideHeader
    >
      <OpsPageIntro
        eyebrow="Issuance Workflow"
        title="Generate front and back ID cards"
        description="Select approved residents, generate secure card identifiers, and export the exact card templates for print-ready production."
        links={[
          { label: "All ID Cards", href: "/id-cards", icon: Search },
          { label: "Generate", href: "/id-cards/generate", icon: Sparkles },
          { label: "Verify", href: "/id-cards/verify", icon: ShieldCheck },
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/id-cards">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All IDs
          </Button>
        </Link>
        {selected?.idNumber && (
          <>
            <Button variant="outline" onClick={() => { setPreviewSide(1); setPreviewOpen(true) }}>
              <Eye className="mr-2 h-4 w-4" />
              Open Last Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => selected?.id && window.open(`/api/id-cards/${selected.id}/export?format=png`, "_blank", "noopener,noreferrer")}
            >
              <Download className="mr-2 h-4 w-4" />
              Export PNG
            </Button>
          </>
        )}
      </div>
      <WorkspaceCard title="Resident Issuance Queue" description={`${filtered.length} approved residents awaiting first ID`}>
        <div className="mb-4 grid gap-3 rounded-xl border border-border/70 bg-muted/40 p-3 md:grid-cols-[1fr_auto]">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search resident by name or resident ID..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Rows per page: {ITEMS_PER_PAGE}</Badge>
            <Badge variant="outline">Total queue: {filtered.length}</Badge>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Kebele</TableHead>
                <TableHead>DOB / Gender</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">No active residents found</TableCell>
                </TableRow>
              ) : (
                pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.firstName} {r.fatherName} {r.grandFatherName}</p>
                      <p className="text-xs text-muted-foreground">Resident #{r.id}</p>
                    </TableCell>
                    <TableCell>{r.kebeleName ?? "Unknown"}</TableCell>
                    <TableCell>
                      <p>{r.dateOfBirth || "N/A"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{r.gender || "N/A"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.phoneNumber || "No phone"}</TableCell>
                    <TableCell><Badge variant="outline">Ready to Issue</Badge></TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => void generateForResident(r.id)}
                        disabled={isChargingPayment && paymentResidentId === r.id}
                      >
                        <Sparkles className="mr-2 h-3.5 w-3.5" />
                        {isChargingPayment && paymentResidentId === r.id ? "Processing..." : "Generate ID Card"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </WorkspaceCard>

      <Dialog open={previewOpen && !!selected?.idNumber} onOpenChange={setPreviewOpen}>
        <DialogContent className="!top-0 !left-0 !translate-x-0 !translate-y-0 !h-screen !w-screen !max-w-none sm:!max-w-none overflow-hidden rounded-none border-0 bg-black/35 p-0 backdrop-blur-md">
          <DialogTitle className="sr-only">ID Card Preview</DialogTitle>
          <DialogDescription className="sr-only">Preview generated ID card front and back sides.</DialogDescription>
          {selected?.idNumber && (
            <div className="h-[calc(100vh-132px)] overflow-auto px-4 py-4 md:px-6">
              {previewSide === 1 ? (
                <div className="print-card-slot flex min-h-[calc(100vh-290px)] items-center justify-center overflow-x-auto pb-3">
                <div className="id-card-cr80 relative aspect-[1.96/1] w-full max-w-[669px] overflow-hidden rounded-none border border-slate-300 bg-[#f7f7f6] p-4 shadow-md">
              <div className="absolute inset-0 opacity-70">
                <div className="absolute -left-12 top-4 h-40 w-64 rounded-none bg-gradient-to-r from-emerald-200/55 to-transparent blur-xl" />
                <div className="absolute right-[-30px] top-8 h-36 w-56 rounded-none bg-gradient-to-l from-red-200/55 to-transparent blur-xl" />
                <div className="absolute left-14 bottom-0 h-24 w-80 rounded-none bg-gradient-to-r from-yellow-200/55 to-transparent blur-xl" />
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:5px_5px] opacity-25" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
                <div className="absolute inset-[-25%] -rotate-[16deg] bg-[repeating-linear-gradient(135deg,rgba(30,41,59,0.08)_0px,rgba(30,41,59,0.08)_2px,transparent_2px,transparent_14px)]" />
                <div className="absolute -left-[560px] -top-16 h-[210%] w-[210%] -rotate-[16deg] text-[6px] font-semibold uppercase tracking-[0.12em] text-slate-500/70">
                  {Array.from({ length: 200 }).map((_, row) => (
                    <p
                      key={row}
                      className="whitespace-nowrap leading-[1.3]"
                      style={{ transform: `translateX(${Math.sin(row / 5) * 8}px)` }}
                    >
                      {Array.from({ length: 18 }).map((__, col) => (
                        <span
                          key={col}
                          className="mr-2 inline-block"
                          style={{ transform: `translateY(${Math.sin((row + col) * 0.45) * 0.9}px)` }}
                        >
                          LEGAL KEBELE IDENTITY CARD
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>

              <div className="relative z-10 grid h-full grid-rows-[62px_minmax(0,1fr)_64px]">
                <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-300 bg-white/90 p-0.5">
                    <Image src="/authority-left.svg" alt="Authority logo" width={56} height={56} className="h-full w-full object-contain" />
                  </div>
                  <div className="leading-tight text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">Federal Democratic Republic of Ethiopia</p>
                    <p className="text-[10px] text-slate-600">National Identity Authority</p>
                    <p className="text-lg font-black tracking-tight text-slate-900">KEBELE IDENTIFICATION CARD</p>
                  </div>
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-slate-300 bg-white/90 p-0.5">
                    <Image src="/authority-right.svg" alt="Authority mark" width={56} height={56} className="h-full w-full object-contain" />
                  </div>
                </div>

                <div className="grid min-h-0 grid-cols-[128px_1fr] items-end gap-3 py-0.5">
                  <div className="relative aspect-[3/4] w-[120px] overflow-hidden rounded-[2px] bg-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_0_14px_rgba(15,23,42,0.14)]">
                    {selected.photoUrl ? (
                      <img src={selected.photoUrl} alt="Resident" className="h-full w-full object-cover [filter:saturate(1.02)]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">PHOTO</div>
                    )}
                  </div>

                  <div className="self-end space-y-2 pb-0.5 text-sm leading-tight">
                    <p className="text-[18px] text-slate-600">
                      Full Name: <span className="font-black uppercase text-slate-900">{selected.firstName} {selected.fatherName} {selected.grandFatherName}</span>
                    </p>
                    <p className="text-[18px]"><span className="text-slate-600">Gender:</span> <span className="font-bold capitalize">{selected.gender}</span></p>
                    <p className="text-[18px]"><span className="text-slate-600">Ethnicity:</span> <span className="font-bold">{selected.ethnicity || "N/A"}</span></p>
                    <p className="text-[18px]"><span className="text-slate-600">Nationality:</span> <span className="font-bold">{selected.nationality || "N/A"}</span></p>
                    <p className="text-[18px] text-slate-600">Kebele: <span className="font-semibold text-slate-900">{selected.kebeleName}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_246px] items-end gap-2 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-[0.015em] text-slate-900">{selected.idNumber}</p>
                    <p className="line-clamp-1 text-[10px] text-slate-700">
                      {[
                        selected.address?.houseNumber,
                        selected.address?.street,
                        selected.address?.city || "Addis Ababa",
                      ].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="relative flex h-[64px] items-center overflow-visible px-1.5 [&_svg]:block [&_svg]:h-[58px] [&_svg]:w-full">
                    <div className="absolute left-1/2 -top-[75px] h-[89px] w-[71px] -translate-x-1/2 overflow-hidden rounded-[2px] shadow-[0_0_10px_rgba(15,23,42,0.18)]">
                      {selected.photoUrl ? (
                        <img src={selected.photoUrl} alt="Resident BW" className="h-full w-full object-cover grayscale blur-[0.2px]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-slate-500">BW</div>
                      )}
                    </div>
                    <Barcode
                      value={selected.idNumber}
                      format="CODE128"
                      height={58}
                      width={1.35}
                      margin={0}
                      displayValue={false}
                      background="#ffffff"
                      renderer="svg"
                      lineColor="#111827"
                    />
                  </div>
                </div>
              </div>
            </div>
                </div>
              ) : (
                <div className="print-card-slot flex min-h-[calc(100vh-290px)] items-center justify-center overflow-x-auto pb-3">
                <div className="id-card-cr80 relative aspect-[1.96/1] w-full max-w-[669px] overflow-hidden rounded-none border border-slate-300 bg-[#f8f8f7] p-4 shadow-md">
              <div className="absolute inset-0 opacity-70">
                <div className="absolute left-[-28px] top-7 h-36 w-52 rounded-none bg-gradient-to-r from-emerald-200/55 to-transparent blur-xl" />
                <div className="absolute left-[-20px] bottom-3 h-24 w-48 rounded-none bg-gradient-to-r from-yellow-200/55 to-transparent blur-xl" />
                <div className="absolute right-[-14px] top-16 h-40 w-52 rounded-none bg-gradient-to-l from-red-200/55 to-transparent blur-xl" />
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:5px_5px] opacity-25" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
                <div className="absolute inset-[-25%] -rotate-[15deg] bg-[repeating-linear-gradient(135deg,rgba(30,41,59,0.08)_0px,rgba(30,41,59,0.08)_2px,transparent_2px,transparent_14px)]" />
                <div className="absolute -left-[560px] -top-16 h-[210%] w-[210%] -rotate-[15deg] text-[6px] font-semibold uppercase tracking-[0.12em] text-slate-500/70">
                  {Array.from({ length: 200 }).map((_, row) => (
                    <p
                      key={row}
                      className="whitespace-nowrap leading-[1.3]"
                      style={{ transform: `translateX(${Math.sin(row / 5) * 8}px)` }}
                    >
                      {Array.from({ length: 18 }).map((__, col) => (
                        <span
                          key={col}
                          className="mr-2 inline-block"
                          style={{ transform: `translateY(${Math.sin((row + col) * 0.45) * 0.9}px)` }}
                        >
                          LEGAL KEBELE IDENTITY CARD
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 [writing-mode:vertical-rl] [text-orientation:mixed]">
                Expires {selected.idExpiryDate || "N/A"}
              </div>

              <div className="relative z-10 grid h-full grid-rows-[36px_minmax(0,1fr)]">
                <div className="flex items-center justify-center text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">Federal Democratic Republic of Ethiopia</p>
                </div>

                <div className="grid min-h-0 grid-cols-[1fr_198px] gap-3">
                  <div className="space-y-0.5 py-1 pl-[10px] text-[16px] leading-tight">
                    <p><span className="text-slate-600">Date of Birth:</span> <span className="font-bold">{selected.dateOfBirth || "N/A"}</span></p>
                    <p><span className="text-slate-600">Marital Status:</span> <span className="font-bold">{selected.maritalStatus || "N/A"}</span></p>
                    <p><span className="text-slate-600">Gender:</span> <span className="font-bold capitalize">{selected.gender || "N/A"}</span></p>
                    <p><span className="text-slate-600">Emergency Contact:</span> <span className="font-bold">{selected.emergencyContactName || "N/A"} {selected.emergencyContactPhone ? `(${selected.emergencyContactPhone})` : ""}</span></p>
                    <p><span className="text-slate-600">Kebele:</span> <span className="font-bold">{selected.kebeleName || "N/A"}</span></p>
                    <p><span className="text-slate-600">Religion:</span> <span className="font-bold">{selected.religion || "N/A"}</span></p>
                    <p><span className="text-slate-600">Occupation:</span> <span className="font-bold">{selected.occupation || "N/A"}</span></p>
                    <p><span className="text-slate-600">Phone:</span> <span className="font-bold">{selected.phoneNumber || "N/A"}</span></p>
                    <p><span className="text-slate-600">Zone:</span> <span className="font-bold">{selectedZone?.name || selected.zoneId}</span></p>
                  </div>

                  <div className="flex items-start justify-end pt-0.5">
                    <div className="flex w-[270px] justify-center rounded-none bg-white p-1.5 shadow-sm">
                      <QRCodeSVG
                        value={selected.qrToken || `${selected.idNumber}|${selected.id}|${selected.kebeleId}`}
                        size={250}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-700">If found, return this ID card to the nearest police station.</p>

              </div>
            </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-white/30 bg-white/80 px-5 py-3 backdrop-blur-md">
            <div />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewSide((p) => (p > 1 ? ((p - 1) as 1 | 2) : p))}
                disabled={previewSide === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <div className="mx-1 flex items-center gap-1 text-slate-500">
                {previewSide === 1 ? <CircleDot className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                {previewSide === 2 ? <CircleDot className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewSide((p) => (p < 2 ? ((p + 1) as 1 | 2) : p))}
                disabled={previewSide === 2}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            {selected?.id && (
              <Button
                className="justify-self-end"
                variant="outline"
                onClick={() => window.open(`/api/id-cards/${selected.id}/export?format=png`, "_blank", "noopener,noreferrer")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export PNG
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
