"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ShieldCheck, Search, ArrowLeft, CheckCircle, XCircle, QrCode, UserRoundCheck, ClipboardPaste } from "lucide-react"
import { parseID, validateIDFormat } from "@/lib/id-system/id-generator"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Resident = {
  id: string
  firstName: string
  fatherName: string
  grandFatherName: string
  idStatus?: string | null
  idNumber?: string | null
}

type QrVerificationResult = {
  valid: boolean
  error?: string
  resident?: {
    id?: string
    fullName?: string
    idNumber?: string
    idStatus?: string
  }
  face?: {
    status?: string
    modelVersion?: string
    qualityScore?: number | string
    updatedAt?: string
  }
}

type VerificationHistoryItem = {
  id: string
  type: "id" | "qr"
  input: string
  valid: boolean
  summary: string
  timestamp: string
}

export default function VerifyIdPage() {
  const [idInput, setIdInput] = useState("")
  const [qrInput, setQrInput] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [residents, setResidents] = useState<Resident[]>([])
  const [qrLoading, setQrLoading] = useState(false)
  const [qrResult, setQrResult] = useState<QrVerificationResult | null>(null)
  const [history, setHistory] = useState<VerificationHistoryItem[]>([])
  const [copyFeedback, setCopyFeedback] = useState("")
  const [lastIdHistoryKey, setLastIdHistoryKey] = useState("")

  const normalized = idInput.trim().toUpperCase()

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/residents", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setResidents(data.residents ?? [])
    }
    void load()
  }, [])

  const result = useMemo(() => {
    if (!submitted || !normalized) return null
    const validation = validateIDFormat(normalized)
    const parsed = parseID(normalized)
    const resident = residents.find((r) => (r.idNumber ?? "").toUpperCase() === normalized)
    return { validation, parsed, resident }
  }, [submitted, normalized, residents])

  const verifyQr = async () => {
    if (!qrInput.trim()) return
    setQrLoading(true)
    const res = await fetch("/api/id-cards/verify-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: qrInput.trim() }),
    })
    const data: QrVerificationResult = await res.json().catch(() => ({ valid: false, error: "Invalid response" }))
    setQrResult(data)
    setHistory((prev) => [
      {
        id: `${Date.now()}-qr`,
        type: "qr" as const,
        input: qrInput.trim().slice(0, 80),
        valid: Boolean(data.valid),
        summary: data.valid
          ? `QR matched ${data.resident?.fullName ?? "resident record"}`
          : data.error ?? "QR verification failed",
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 12))
    setQrLoading(false)
  }

  useEffect(() => {
    if (!result || !submitted || !normalized) return
    const signature = `${normalized}:${result.validation.isValid}:${result.resident?.id ?? "none"}`
    if (signature === lastIdHistoryKey) return
    setLastIdHistoryKey(signature)
    setHistory((prev) => [
      {
        id: `${Date.now()}-id`,
        type: "id" as const,
        input: normalized,
        valid: Boolean(result.validation.isValid),
        summary: result.validation.isValid
          ? result.resident
            ? `Matched ${result.resident.firstName} ${result.resident.fatherName}`
            : "Format valid, no resident match"
          : result.validation.errors[0] ?? "ID verification failed",
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 12))
  }, [result, submitted, normalized, lastIdHistoryKey])

  const handlePaste = async (target: "id" | "qr") => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text?.trim()) return
      if (target === "id") {
        setIdInput(text.trim().toUpperCase())
        return
      }
      setQrInput(text.trim())
    } catch {
      // ignore clipboard permission failures
    }
  }

  const copyReport = async (payload: object, label: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setCopyFeedback(`${label} report copied`)
      window.setTimeout(() => setCopyFeedback(""), 1500)
    } catch {
      setCopyFeedback("Clipboard access denied")
      window.setTimeout(() => setCopyFeedback(""), 1500)
    }
  }

  const downloadReport = (payload: object, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageShell
      title="Verify ID"
      hideHeader
      actions={
        <Link href="/id-cards">
          <Button variant="outline" className="h-9 rounded-none">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All IDs
          </Button>
        </Link>
      }
    >
      <OpsPageIntro
        eyebrow="Verification Workflow"
        title="ID and QR authenticity checks"
        description="Validate check digits, parse administrative codes, and verify QR tokens against live registry records before any service action."
        links={[
          { label: "All ID Cards", href: "/id-cards", icon: Search },
          { label: "Generate", href: "/id-cards/generate", icon: ShieldCheck },
          { label: "Verify", href: "/id-cards/verify", icon: CheckCircle },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-none border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">ID Format</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold tracking-[-0.03em]">{result?.validation.isValid ? "Valid" : submitted ? "Invalid" : "Pending"}</p>
            <span className={`rounded-none border p-1.5 ${result?.validation.isValid ? "border-emerald-300/80 bg-emerald-50 text-emerald-700" : "border-amber-300/80 bg-amber-50 text-amber-700"}`}>
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-none border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Resident Match</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold tracking-[-0.03em]">{result?.resident ? "Matched" : submitted ? "No Match" : "Pending"}</p>
            <span className={`rounded-none border p-1.5 ${result?.resident ? "border-emerald-300/80 bg-emerald-50 text-emerald-700" : "border-zinc-300/80 bg-zinc-50 text-zinc-700"}`}>
              <UserRoundCheck className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="rounded-none border border-border/70 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">QR Signature</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-semibold tracking-[-0.03em]">{qrResult?.valid ? "Valid" : qrResult ? "Invalid" : "Pending"}</p>
            <span className={`rounded-none border p-1.5 ${qrResult?.valid ? "border-emerald-300/80 bg-emerald-50 text-emerald-700" : "border-sky-300/80 bg-sky-50 text-sky-700"}`}>
              <QrCode className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WorkspaceCard title="ID Number Verification" description="Validate structure, check digit, and resident registry match">
          <div className="mb-4 grid gap-2 rounded-none border border-border/70 bg-muted/30 p-3 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 rounded-none pl-9 font-mono"
                placeholder="ETH-ADD-01-01-01-2026-000123-7"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSubmitted(true)
                }}
              />
            </div>
            <Button className="h-9 rounded-none" variant="outline" onClick={() => void handlePaste("id")}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste
            </Button>
            <Button className="h-9 rounded-none" onClick={() => setSubmitted(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify
            </Button>
            <Button
              className="h-9 rounded-none"
              variant="ghost"
              onClick={() => {
                setIdInput("")
                setSubmitted(false)
              }}
            >
              Clear
            </Button>
          </div>

          {submitted && !normalized && (
            <div className="rounded-none border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Enter an ID number before running verification.
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-8 rounded-none"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copyReport(
                      {
                        checkedAt: new Date().toISOString(),
                        input: normalized,
                        validation: result.validation,
                        parsed: result.parsed,
                        resident: result.resident,
                      },
                      "ID verification"
                    )
                  }
                >
                  Copy Report
                </Button>
                <Button
                  className="h-8 rounded-none"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadReport(
                      {
                        checkedAt: new Date().toISOString(),
                        input: normalized,
                        validation: result.validation,
                        parsed: result.parsed,
                        resident: result.resident,
                      },
                      `id-verification-${Date.now()}.json`
                    )
                  }
                >
                  Download JSON
                </Button>
                {copyFeedback && <p className="text-xs text-muted-foreground">{copyFeedback}</p>}
              </div>
              <div className={`rounded-none border px-4 py-3 ${result.validation.isValid ? "border-emerald-300/80 bg-emerald-50/70" : "border-destructive/40 bg-destructive/10"}`}>
                <div className="flex items-center gap-2">
                  {result.validation.isValid ? (
                    <CheckCircle className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <p className="font-semibold">
                    {result.validation.isValid ? "ID format and check digit verified" : "ID format is invalid"}
                  </p>
                </div>
                {!result.validation.isValid && result.validation.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {result.validation.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>

              {result.parsed && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Badge variant="outline" className="justify-start rounded-none">Country: {result.parsed.countryCode}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">City: {result.parsed.cityCode}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">Zone: {result.parsed.zoneCode}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">Woreda: {result.parsed.woredaCode}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">Kebele: {result.parsed.kebeleCode}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">Year: {result.parsed.year}</Badge>
                  <Badge variant="outline" className="justify-start rounded-none">Sequence: {result.parsed.sequence}</Badge>
                  <Badge variant={result.parsed.isValid ? "default" : "destructive"} className="justify-start rounded-none">
                    Check Digit: {result.parsed.checkDigit}
                  </Badge>
                </div>
              )}

              <div className="rounded-none border border-border/70 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Registry Match</p>
                {result.resident ? (
                  <div className="mt-2">
                    <p className="font-medium">{result.resident.firstName} {result.resident.fatherName} {result.resident.grandFatherName}</p>
                    <p className="text-sm text-muted-foreground">
                      Resident #{result.resident.id} {result.resident.idStatus ? `· ${result.resident.idStatus}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No resident record found for this ID number.</p>
                )}
              </div>
            </div>
          )}
        </WorkspaceCard>

        <WorkspaceCard title="QR Verification" description="Validate signed QR payload against live server records">
          <div className="mb-4 grid gap-2 rounded-none border border-border/70 bg-muted/30 p-3 md:grid-cols-[1fr_auto_auto_auto]">
            <Input
              className="h-9 rounded-none font-mono"
              placeholder="Paste signed QR token"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void verifyQr()
              }}
            />
            <Button className="h-9 rounded-none" variant="outline" onClick={() => void handlePaste("qr")}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste
            </Button>
            <Button className="h-9 rounded-none" onClick={() => void verifyQr()} disabled={qrLoading}>
              <QrCode className="mr-2 h-4 w-4" />
              {qrLoading ? "Verifying..." : "Verify QR"}
            </Button>
            <Button
              className="h-9 rounded-none"
              variant="ghost"
              onClick={() => {
                setQrInput("")
                setQrResult(null)
              }}
            >
              Clear
            </Button>
          </div>

          {qrResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="h-8 rounded-none"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void copyReport(
                      {
                        checkedAt: new Date().toISOString(),
                        tokenPreview: qrInput.trim().slice(0, 80),
                        result: qrResult,
                      },
                      "QR verification"
                    )
                  }
                >
                  Copy Report
                </Button>
                <Button
                  className="h-8 rounded-none"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadReport(
                      {
                        checkedAt: new Date().toISOString(),
                        tokenPreview: qrInput.trim().slice(0, 80),
                        result: qrResult,
                      },
                      `qr-verification-${Date.now()}.json`
                    )
                  }
                >
                  Download JSON
                </Button>
              </div>
              <div className={`rounded-none border px-4 py-3 ${qrResult.valid ? "border-emerald-300/80 bg-emerald-50/70" : "border-destructive/40 bg-destructive/10"}`}>
                <div className="flex items-center gap-2">
                  {qrResult.valid ? (
                    <CheckCircle className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <p className="font-semibold">{qrResult.valid ? "Valid signed QR token" : "Invalid QR token"}</p>
                </div>
                {!qrResult.valid && (
                  <p className="mt-2 text-sm text-muted-foreground">{qrResult.error ?? "Verification failed"}</p>
                )}
              </div>

              {qrResult.valid && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-none border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Resident</p>
                    <p className="mt-2 font-medium">{qrResult.resident?.fullName ?? "N/A"}</p>
                    <p className="text-sm text-muted-foreground">
                      #{qrResult.resident?.id ?? "N/A"} · {qrResult.resident?.idNumber ?? "N/A"} · {qrResult.resident?.idStatus ?? "N/A"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border/70 bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Face Metadata</p>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <p>Status: <span className="font-semibold">{qrResult.face?.status ?? "N/A"}</span></p>
                      <p>Model: <span className="font-semibold">{qrResult.face?.modelVersion ?? "N/A"}</span></p>
                      <p>Quality: <span className="font-semibold">{qrResult.face?.qualityScore ?? "N/A"}</span></p>
                      <p>Updated: <span className="font-semibold">{qrResult.face?.updatedAt ?? "N/A"}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="Recent Verification Activity" description="Latest checks from this session">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verification activity yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border/70 bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-none">{item.type.toUpperCase()}</Badge>
                    <Badge variant={item.valid ? "default" : "destructive"} className="rounded-none">
                      {item.valid ? "Valid" : "Invalid"}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs">{item.input}</p>
                  <p className="text-xs text-muted-foreground">{item.summary}</p>
                </div>
                <Button
                  className="h-8 rounded-none"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (item.type === "id") {
                      setIdInput(item.input)
                      setSubmitted(true)
                      return
                    }
                    setQrInput(item.input)
                  }}
                >
                  Reuse
                </Button>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCard>
    </PageShell>
  )
}
