"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Link2 } from "lucide-react"
import { toast } from "sonner"
import Barcode from "react-barcode"
import { QRCodeSVG } from "qrcode.react"
import { generateID } from "@/lib/id-system/id-generator"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { EthioPayCardDetails, EthioPayPaymentDialog } from "@/components/payments/ethiopay-payment-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/auth-context"
import { canAccess } from "@/lib/auth/permissions"

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
  maritalStatus?: string | null
  ethnicity?: string | null
  nationality?: string | null
  religion?: string | null
  occupation?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  phoneNumber?: string | null
  photoUrl?: string | null
  idNumber?: string | null
  idStatus?: string | null
  idIssuedDate?: string | null
  idExpiryDate?: string | null
  qrToken?: string | null
  address?: { city?: string; street?: string; houseNumber?: string }
}

type HistoryItem = {
  id: string
  description: string
  performedBy: string
  timestamp: string
}
type Woreda = { id: string; code: string; name: string }
type Kebele = { id: string; code: string; zoneId: string; woredaId: string; name: string }
type Zone = { id: string; code: string; name: string }
const DEFAULT_ID_REISSUE_FEE_ETB = 100

function toTwoDigitCode(value: string | undefined): string {
  if (!value) return "01"
  const digits = value.replace(/\D/g, "")
  if (!digits) return "01"
  const n = Number.parseInt(digits.slice(-3), 10)
  if (!Number.isFinite(n)) return "01"
  return String(Math.max(1, n % 100 || n)).padStart(2, "0").slice(-2)
}

export default function IdCardDetailsPage() {
  const { user } = useAuth()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const residentId = params?.id
  const isPdfMode = searchParams.get("pdf") === "1"
  const [resident, setResident] = useState<Resident | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [kebeles, setKebeles] = useState<Kebele[]>([])
  const [isReissuing, setIsReissuing] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [isChargingPayment, setIsChargingPayment] = useState(false)
  const [pendingPaymentReference, setPendingPaymentReference] = useState<string | null>(null)
  const [idReissueFeeEtb, setIdReissueFeeEtb] = useState(DEFAULT_ID_REISSUE_FEE_ETB)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!residentId) return
      setLoading(true)
      const [resResidents, resHistory, resGeo] = await Promise.all([
        fetch("/api/residents", { cache: "no-store" }),
        fetch(`/api/residents/${residentId}/id-history`, { cache: "no-store" }),
        fetch("/api/geography", { cache: "no-store" }),
      ])

      if (resResidents.ok) {
        const data = await resResidents.json()
        const found = (data.residents ?? []).find((r: Resident) => r.id === residentId) ?? null
        if (found?.idNumber) {
          const qrRes = await fetch(`/api/residents/${residentId}/qr-token`, { cache: "no-store" })
          if (qrRes.ok) {
            const qrData = await qrRes.json()
            setResident({ ...found, qrToken: qrData.qrToken ?? null })
          } else {
            setResident(found)
          }
        } else {
          setResident(found)
        }
      }
      if (resHistory.ok) {
        const data = await resHistory.json()
        setHistory(data.history ?? [])
      }
      if (resGeo.ok) {
        const data = await resGeo.json()
        setWoredas(data.woredas ?? [])
        setKebeles(data.kebeles ?? [])
        setZones(data.zones ?? [])
      }
      setLoading(false)
    }
    void load()
  }, [residentId])

  useEffect(() => {
    const loadFees = async () => {
      const res = await fetch("/api/settings/payment-fees", { cache: "no-store" })
      if (!res.ok) return
      const payload = await res.json().catch(() => null)
      const fee = Number(payload?.fees?.reissueFeeEtb)
      if (Number.isFinite(fee) && fee > 0) setIdReissueFeeEtb(fee)
    }
    void loadFees()
  }, [])

  const displayName = useMemo(
    () => resident ? `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}` : "",
    [resident],
  )
  const selectedZone = zones.find((z) => z.id === resident?.zoneId)
  const canReissue = user ? canAccess(user.role, "id:reissue") || canAccess(user.role, "id:generate") : false

  const issueReissueWithReference = async (paymentReference: string) => {
    if (!resident) return false
    const kebele = kebeles.find((k) => k.id === resident.kebeleId)
    if (!kebele) {
      setIsReissuing(false)
      toast.error("Kebele metadata not found.")
      return false
    }
    const woreda = woredas.find((w) => w.id === kebele.woredaId)
    if (!woreda) {
      setIsReissuing(false)
      toast.error("Woreda metadata not found.")
      return false
    }

    setIsReissuing(true)
    const zone = zones.find((z) => z.id === kebele.zoneId)
    if (!zone) {
      setIsReissuing(false)
      toast.error("Zone metadata not found.")
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
        reissue: true,
        paymentReference,
      }),
    })
    if (res.ok) {
      const issued = await res.json()
      setResident((prev) =>
        prev
          ? {
              ...prev,
              idNumber: output.idNumber,
              idStatus: "reissued",
              idIssuedDate: issuedDate,
              idExpiryDate,
              qrToken: issued?.qrToken ?? null,
            }
          : prev,
      )
      setPendingPaymentReference(null)
      const resHistory = await fetch(`/api/residents/${resident.id}/id-history`, { cache: "no-store" })
      if (resHistory.ok) {
        const data = await resHistory.json()
        setHistory(data.history ?? [])
      }
      toast.success("ID reissued successfully.")
      setIsReissuing(false)
      return true
    } else {
      const err = await res.json().catch(() => null)
      toast.error(err?.error ?? "Failed to reissue ID card.")
      setIsReissuing(false)
      return false
    }
  }

  const handleReissue = async () => {
    if (!resident) return
    if (pendingPaymentReference) {
      setIsReissuing(true)
      const ok = await issueReissueWithReference(pendingPaymentReference)
      if (!ok) {
        toast.error("Payment already captured. Retry Reissue to reuse the same payment.")
      }
      return
    }
    setPaymentDialogOpen(true)
  }

  const handlePaymentSubmit = async (details: EthioPayCardDetails) => {
    if (!resident) return
    setIsChargingPayment(true)
    const chargeRes = await fetch("/api/payments/ethiopay/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentId: resident.id,
        mode: "reissue",
        ...details,
      }),
    })
    if (!chargeRes.ok) {
      const err = await chargeRes.json().catch(() => null)
      toast.error(err?.error ?? "EthioPay payment failed.")
      setIsChargingPayment(false)
      return
    }
    const chargePayload = await chargeRes.json().catch(() => null)
    const paymentReference = chargePayload?.transaction?.transactionRef as string | undefined
    if (!paymentReference) {
      toast.error("Payment succeeded but transaction reference is missing.")
      setIsChargingPayment(false)
      return
    }

    setPendingPaymentReference(paymentReference)
    setPaymentDialogOpen(false)
    setIsChargingPayment(false)
    setIsReissuing(true)
    const ok = await issueReissueWithReference(paymentReference)
    if (!ok) {
      toast.error("Payment captured. Retry Reissue to finalize without charging again.")
    }
  }

  return (
    <PageShell
      title="ID Template and History"
      hideHeader
      className={isPdfMode ? "space-y-0" : undefined}
    >
      {!isPdfMode && (
        <OpsPageIntro
          eyebrow="ID Card Registry"
          title="ID Template and History"
          description="Inspect final front and back card templates and review issuance/reissue timeline for this resident."
          links={[
            { label: "All ID Cards", href: "/id-cards", icon: ArrowLeft },
            { label: "Generate", href: "/id-cards/generate", icon: Download },
            { label: "Verify", href: "/id-cards/verify", icon: Link2 },
          ]}
        />
      )}
      {!isPdfMode && (
        <div className="no-print flex flex-wrap gap-2">
          <Link href="/id-cards">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All ID Cards
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => resident?.id && window.open(`/api/id-cards/${resident.id}/export?format=png`, "_blank", "noopener,noreferrer")}
            disabled={!resident?.idNumber}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PNG
          </Button>
          {canReissue && (
            <Button onClick={() => void handleReissue()} disabled={!resident?.idNumber || isReissuing || isChargingPayment}>
              {isReissuing || isChargingPayment ? "Reissuing..." : "Reissue ID"}
            </Button>
          )}
        </div>
      )}
      <EthioPayPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          if (!isChargingPayment) setPaymentDialogOpen(open)
        }}
        amountEtb={idReissueFeeEtb}
        title="EthioPay ID Reissue Payment"
        description="Enter payer card details to process the ID reissue fee."
        submitLabel="Pay and Reissue"
        isSubmitting={isChargingPayment}
        onSubmit={handlePaymentSubmit}
      />
      {loading ? (
        <WorkspaceCard title="Loading">
          <p className="text-sm text-muted-foreground">Loading resident ID data...</p>
        </WorkspaceCard>
      ) : !resident || !resident.idNumber ? (
        <WorkspaceCard title="No Generated ID">
          <p className="text-sm text-muted-foreground">Resident not found or ID card is not generated yet.</p>
        </WorkspaceCard>
      ) : (
        <>
          <WorkspaceCard title={isPdfMode ? "" : "ID Card Template"} description={isPdfMode ? undefined : displayName}>
            <div className="print-two-cards grid gap-6 lg:grid-cols-2">
              <div className="print-card-slot">
              <div
                className={`id-card-cr80 relative w-full max-w-[669px] rounded-none border border-slate-300 bg-[#f7f7f6] shadow-md ${
                  isPdfMode ? "aspect-[1.72/1] overflow-visible p-3" : "aspect-[1.96/1] overflow-hidden p-4"
                }`}
              >
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

                <div className="relative z-10 grid h-full grid-rows-[62px_minmax(0,1fr)_78px]">
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
                      {resident.photoUrl ? (
                        <img src={resident.photoUrl} alt="Resident" className="h-full w-full object-cover [filter:saturate(1.02)]" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">PHOTO</div>
                      )}
                    </div>
                    <div className="self-end space-y-2 pb-0.5 text-sm leading-tight">
                      <p className="text-[18px] text-slate-600">
                        Full Name: <span className="font-black uppercase text-slate-900">{displayName}</span>
                      </p>
                      <p className="text-[18px]"><span className="text-slate-600">Gender:</span> <span className="font-bold capitalize">{resident.gender}</span></p>
                      <p className="text-[18px]"><span className="text-slate-600">Ethnicity:</span> <span className="font-bold">{resident.ethnicity || "N/A"}</span></p>
                      <p className="text-[18px]"><span className="text-slate-600">Nationality:</span> <span className="font-bold">{resident.nationality || "N/A"}</span></p>
                      <p className="text-[18px] text-slate-600">Kebele: <span className="font-semibold text-slate-900">{resident.kebeleName}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_246px] items-end gap-2 px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black tracking-[0.015em] text-slate-900">{resident.idNumber}</p>
                      <p className="line-clamp-1 text-[10px] text-slate-700">
                        {[resident.address?.houseNumber, resident.address?.street, resident.address?.city || "Addis Ababa"].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="relative flex h-[64px] items-center overflow-visible px-1.5 [&_svg]:block [&_svg]:h-[58px] [&_svg]:w-full">
                      <div className="absolute left-1/2 -top-[75px] h-[89px] w-[71px] -translate-x-1/2 overflow-hidden rounded-[2px] shadow-[0_0_10px_rgba(15,23,42,0.18)]">
                        {resident.photoUrl ? (
                          <img src={resident.photoUrl} alt="Resident BW" className="h-full w-full object-cover grayscale blur-[0.2px]" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[9px] text-slate-500">BW</div>
                        )}
                      </div>
                      <Barcode
                        value={resident.idNumber}
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

              <div className="print-card-slot">
              <div
                className={`id-card-cr80 relative w-full max-w-[669px] rounded-none border border-slate-300 bg-[#f8f8f7] shadow-md ${
                  isPdfMode ? "aspect-[1.72/1] overflow-visible p-3" : "aspect-[1.96/1] overflow-hidden p-4"
                }`}
              >
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
                  Expires {resident.idExpiryDate || "N/A"}
                </div>

                <div className="relative z-10 grid h-full grid-rows-[36px_minmax(0,1fr)]">
                  <div className="flex items-center justify-center text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">Federal Democratic Republic of Ethiopia</p>
                  </div>
                  <div className="grid min-h-0 grid-cols-[1fr_198px] gap-3">
                    <div className="space-y-0.5 py-1 pl-[10px] text-[16px] leading-tight">
                      <p><span className="text-slate-600">Date of Birth:</span> <span className="font-bold">{resident.dateOfBirth || "N/A"}</span></p>
                      <p><span className="text-slate-600">Marital Status:</span> <span className="font-bold">{resident.maritalStatus || "N/A"}</span></p>
                      <p><span className="text-slate-600">Gender:</span> <span className="font-bold capitalize">{resident.gender || "N/A"}</span></p>
                      <p><span className="text-slate-600">Emergency Contact:</span> <span className="font-bold">{resident.emergencyContactName || "N/A"} {resident.emergencyContactPhone ? `(${resident.emergencyContactPhone})` : ""}</span></p>
                      <p><span className="text-slate-600">Kebele:</span> <span className="font-bold">{resident.kebeleName || "N/A"}</span></p>
                      <p><span className="text-slate-600">Religion:</span> <span className="font-bold">{resident.religion || "N/A"}</span></p>
                      <p><span className="text-slate-600">Occupation:</span> <span className="font-bold">{resident.occupation || "N/A"}</span></p>
                      <p><span className="text-slate-600">Phone:</span> <span className="font-bold">{resident.phoneNumber || "N/A"}</span></p>
                      <p><span className="text-slate-600">Zone:</span> <span className="font-bold">{selectedZone?.name || resident.zoneId}</span></p>
                    </div>
                  <div className="flex items-start justify-end pt-0.5">
                    <div className="flex w-[270px] justify-center rounded-none bg-white p-1.5 shadow-sm">
                      <QRCodeSVG
                        value={resident.qrToken || `${resident.idNumber}|${resident.id}|${resident.kebeleId}`}
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
            </div>
          </WorkspaceCard>

          {!isPdfMode && <WorkspaceCard title="Issuance History" description="Created and reissued timeline">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ID issuance history found.</p>
            ) : (
              <div className="relative pl-8">
                <div className="absolute left-[14px] top-1 bottom-1 w-px bg-slate-300" />
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <div key={item.id} className="relative border bg-card p-3">
                      <div className="absolute -left-[31px] top-4 flex h-6 w-6 items-center justify-center border border-slate-300 bg-white">
                        <Link2 className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <p className="font-medium">{item.description}</p>
                        <Badge variant={index === 0 ? "default" : "outline"}>
                          {index === 0 ? "Latest" : "Previous"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">By: {item.performedBy}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </WorkspaceCard>}
        </>
      )}
    </PageShell>
  )
}
