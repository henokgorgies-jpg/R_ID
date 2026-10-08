"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, UserPlus, Search, CheckCircle2, Check, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { isStepComplete } from "@/lib/forms/register-step-validation"
import { PageShell } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"

type Zone = { id: string; name: string }
type Woreda = { id: string; zoneId: string; name: string }
type Kebele = { id: string; woredaId: string; name: string }
type SectionKey = "personal" | "contact" | "administrative" | "household"
type HeadOption = {
  id: string
  householdId: string
  firstName: string
  fatherName: string
  grandFatherName: string
  zoneId: string
  woredaId: string
  kebeleId: string
}
type ResidentOption = {
  id: string
  householdId?: string | null
  householdRole?: string | null
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "separated"
  zoneId?: string
  woredaId?: string
  kebeleId?: string
  address?: {
    childrenNames?: string[]
    relatives?: Array<{
      firstName?: string
      fatherName?: string
      grandFatherName?: string
    }>
    spouseNameParts?: {
      firstName?: string
      fatherName?: string
      grandFatherName?: string
    }
  }
  gender?: "male" | "female"
  firstName: string
  fatherName: string
  grandFatherName: string
}

export default function NewResidentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [faceFeedback, setFaceFeedback] = useState<{
    status: "pending" | "ready" | "failed"
    error?: string | null
    match?: { residentId: string; similarity: number; decision: "block" | "review" | "clear" } | null
  } | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [kebeles, setKebeles] = useState<Kebele[]>([])
  const [heads, setHeads] = useState<HeadOption[]>([])
  const [residentOptions, setResidentOptions] = useState<ResidentOption[]>([])
  const [spouseLockReason, setSpouseLockReason] = useState<string>("")
  const [autoFamilyLinkNote, setAutoFamilyLinkNote] = useState<string>("")
  const [spouseSearchQuery, setSpouseSearchQuery] = useState("")
  const [childSearchQuery, setChildSearchQuery] = useState("")
  const [relativeDraft, setRelativeDraft] = useState({
    firstName: "",
    fatherName: "",
    grandFatherName: "",
  })
  const [relatives, setRelatives] = useState<Array<{ firstName: string; fatherName: string; grandFatherName: string }>>([])
  const [activeSection, setActiveSection] = useState<SectionKey>("personal")
  const [householdMode, setHouseholdMode] = useState<"new" | "existing">("new")
  const [householdValidation, setHouseholdValidation] = useState<"idle" | "checking" | "valid" | "invalid">("idle")
  const [householdValidationMessage, setHouseholdValidationMessage] = useState("")
  const sectionOrder: SectionKey[] = ["personal", "contact", "administrative", "household"]
  const sectionLabels: Record<SectionKey, string> = {
    personal: "Personal Information",
    contact: "Contact and Address",
    administrative: "Administrative Scope",
    household: "Household and Photo",
  }

  const [formData, setFormData] = useState({
    firstName: "",
    fatherName: "",
    grandFatherName: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    nationality: "Ethiopian",
    ethnicity: "",
    religion: "",
    occupation: "",
    email: "",
    phoneNumber: "",
    zoneId: "",
    woredaId: "",
    kebeleId: "",
    city: "Addis Ababa",
    subcity: "",
    streetName: "",
    houseNumber: "",
    householdId: "",
    householdRole: "",
    linkedHeadResidentId: "",
    motherName: "",
    spouseResidentId: "",
    spouseFirstName: "",
    spouseFatherName: "",
    spouseGrandFatherName: "",
    fatherResidentId: "",
    motherResidentId: "",
    fatherNameDetected: "",
    motherNameDetected: "",
    childrenNames: "",
    photoUrl: "",
  })

  const generateHouseholdId = () => `household-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const normalized = (value: string) => value.trim().toLowerCase()
  const residentFullName = useMemo(
    () => [formData.firstName, formData.fatherName, formData.grandFatherName].map((v) => v.trim()).filter(Boolean).join(" "),
    [formData.firstName, formData.fatherName, formData.grandFatherName],
  )
  const familyMatchedHead = useMemo(() => {
    if (!residentFullName) return null
    const normalizedFullName = normalized(residentFullName)
    const scopedCandidates = residentOptions.filter((resident) => {
      if (resident.householdRole !== "head" || !resident.householdId) return false
      if (formData.kebeleId && resident.kebeleId !== formData.kebeleId) return false
      if (formData.woredaId && resident.woredaId !== formData.woredaId) return false
      if (formData.zoneId && resident.zoneId !== formData.zoneId) return false
      const childrenNames = Array.isArray(resident.address?.childrenNames) ? resident.address?.childrenNames : []
      return childrenNames.some((name) => normalized(name) === normalizedFullName)
    })
    return scopedCandidates[0] ?? null
  }, [residentOptions, residentFullName, formData.zoneId, formData.woredaId, formData.kebeleId])
  const familyMatchedMother = useMemo(() => {
    if (!familyMatchedHead?.householdId) return null
    return (
      residentOptions.find(
        (resident) =>
          resident.householdId === familyMatchedHead.householdId &&
          resident.householdRole === "spouse" &&
          resident.id !== familyMatchedHead.id,
      ) ?? null
    )
  }, [residentOptions, familyMatchedHead])
  const matchedSpouseHead = useMemo(() => {
    if (!formData.firstName || !formData.fatherName || !formData.grandFatherName) return null
    return residentOptions.find((resident) => {
      if (resident.householdRole !== "head" || !resident.householdId) return false
      const parts = resident.address?.spouseNameParts
      if (!parts?.firstName || !parts?.fatherName || !parts?.grandFatherName) return false
      return (
        normalized(parts.firstName) === normalized(formData.firstName) &&
        normalized(parts.fatherName) === normalized(formData.fatherName) &&
        normalized(parts.grandFatherName) === normalized(formData.grandFatherName)
      )
    }) ?? null
  }, [residentOptions, formData.firstName, formData.fatherName, formData.grandFatherName])
  const childSearchResults = useMemo(() => {
    const query = childSearchQuery.trim().toLowerCase()
    if (!query) return []
    return residentOptions
      .filter((resident) =>
        `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [residentOptions, childSearchQuery])
  const spouseResidentOptions = useMemo(
    () =>
      residentOptions.filter((resident) => {
        if (resident.id === formData.linkedHeadResidentId) return false
        if (formData.zoneId && resident.zoneId !== formData.zoneId) return false
        if (formData.woredaId && resident.woredaId !== formData.woredaId) return false
        if (formData.kebeleId && resident.kebeleId !== formData.kebeleId) return false
        return true
      }),
    [residentOptions, formData.linkedHeadResidentId, formData.zoneId, formData.woredaId, formData.kebeleId],
  )
  const filteredSpouseOptions = useMemo(() => {
    const query = spouseSearchQuery.trim().toLowerCase()
    if (!query) return []
    return spouseResidentOptions
      .filter((resident) =>
        `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.toLowerCase().includes(query),
      )
      .slice(0, 8)
  }, [spouseResidentOptions, spouseSearchQuery])

  useEffect(() => {
    const load = async () => {
      const [resGeo, resResidents] = await Promise.all([
        fetch("/api/geography", { cache: "no-store" }),
        fetch("/api/residents", { cache: "no-store" }),
      ])
      if (resGeo.ok) {
        const data = await resGeo.json()
        setZones(data.zones ?? [])
        setWoredas(data.woredas ?? [])
        setKebeles(data.kebeles ?? [])
      }
      if (resResidents.ok) {
        const data = await resResidents.json()
        setResidentOptions(data.residents ?? [])
        const headRows = (data.residents ?? [])
          .filter((r: any) => r.householdRole === "head" && !!r.householdId)
          .map((r: any) => ({
            id: r.id,
            householdId: r.householdId,
            firstName: r.firstName,
            fatherName: r.fatherName,
            grandFatherName: r.grandFatherName,
            zoneId: r.zoneId,
            woredaId: r.woredaId,
            kebeleId: r.kebeleId,
          }))
        setHeads(headRows)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    setFormData((prev) => (prev.householdId ? prev : { ...prev, householdId: generateHouseholdId() }))
  }, [])

  useEffect(() => {
    if (formData.householdRole && formData.householdRole !== "head") {
      setHouseholdMode("existing")
      return
    }
    if (matchedSpouseHead) {
      setHouseholdMode("existing")
    }
  }, [formData.householdRole, matchedSpouseHead])

  useEffect(() => {
    if (householdMode === "new") {
      setFormData((prev) => ({
        ...prev,
        householdId: prev.householdId || generateHouseholdId(),
      }))
      setHouseholdValidation("idle")
      setHouseholdValidationMessage("Auto-generated household ID ready.")
    } else {
      setFormData((prev) => ({
        ...prev,
        householdId: prev.householdRole !== "head" && prev.linkedHeadResidentId ? prev.householdId : "",
      }))
      setHouseholdValidation("idle")
      setHouseholdValidationMessage("")
    }
  }, [householdMode])

  const validateHouseholdId = async (opts?: { showToast?: boolean }) => {
    const showToast = opts?.showToast ?? true
    const householdId = formData.householdId.trim()
    if (!householdId) {
      setHouseholdValidation("invalid")
      setHouseholdValidationMessage("Household ID is required.")
      if (showToast) toast.error("Please enter a household ID.")
      return false
    }

    setHouseholdValidation("checking")
    setHouseholdValidationMessage("Checking household ID...")

    const params = new URLSearchParams({
      id: householdId,
      zoneId: formData.zoneId,
      woredaId: formData.woredaId,
      kebeleId: formData.kebeleId,
    })
    const res = await fetch(`/api/households/validate?${params.toString()}`, { cache: "no-store" })
    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      setHouseholdValidation("invalid")
      setHouseholdValidationMessage(payload?.error ?? "Validation failed.")
      if (showToast) toast.error(payload?.error ?? "Failed to validate household ID.")
      return false
    }

    if (!payload?.exists) {
      setHouseholdValidation("invalid")
      setHouseholdValidationMessage("Household does not exist.")
      if (showToast) toast.error("Household ID not found.")
      return false
    }

    if (!payload?.inScope) {
      setHouseholdValidation("invalid")
      setHouseholdValidationMessage("Household exists but not in selected zone/woreda/kebele.")
      if (showToast) toast.error("Household is outside the selected administrative scope.")
      return false
    }

    setHouseholdValidation("valid")
    setHouseholdValidationMessage("Household found in selected scope.")
    if (showToast) toast.success("Household ID verified.")
    return true
  }

  const availableWoredas = useMemo(() => woredas.filter((w) => w.zoneId === formData.zoneId), [woredas, formData.zoneId])
  const availableKebeles = useMemo(() => kebeles.filter((k) => k.woredaId === formData.woredaId), [kebeles, formData.woredaId])
  const availableHeads = useMemo(
    () =>
      heads.filter((h) => {
        if (formData.kebeleId) return h.kebeleId === formData.kebeleId
        if (formData.woredaId) return h.woredaId === formData.woredaId
        if (formData.zoneId) return h.zoneId === formData.zoneId
        return true
      }),
    [heads, formData.zoneId, formData.woredaId, formData.kebeleId],
  )
  const allowedHouseholdRoles = useMemo(() => {
    if (formData.maritalStatus === "single") {
      return ["head", "child"] as const
    }
    return ["head", "spouse", "child", "relative"] as const
  }, [formData.maritalStatus])

  useEffect(() => {
    if (!formData.householdRole) return
    if (!allowedHouseholdRoles.includes(formData.householdRole as any)) {
      setFormData((prev) => ({
        ...prev,
        householdRole: "",
        linkedHeadResidentId: "",
      }))
    }
  }, [allowedHouseholdRoles, formData.householdRole])

  useEffect(() => {
    if (!matchedSpouseHead) {
      setSpouseLockReason("")
      return
    }
    setSpouseLockReason(`Matched as spouse of ${matchedSpouseHead.firstName} ${matchedSpouseHead.fatherName} ${matchedSpouseHead.grandFatherName}`)
    setFormData((prev) => ({
      ...prev,
      maritalStatus: "married",
      householdRole: "spouse",
      linkedHeadResidentId: matchedSpouseHead.id,
      householdId: matchedSpouseHead.householdId ?? prev.householdId,
      zoneId: matchedSpouseHead.zoneId ?? prev.zoneId,
      woredaId: matchedSpouseHead.woredaId ?? prev.woredaId,
      kebeleId: matchedSpouseHead.kebeleId ?? prev.kebeleId,
      spouseResidentId: matchedSpouseHead.id,
      spouseFirstName: matchedSpouseHead.firstName,
      spouseFatherName: matchedSpouseHead.fatherName,
      spouseGrandFatherName: matchedSpouseHead.grandFatherName,
    }))
  }, [matchedSpouseHead])

  useEffect(() => {
    const shouldVisibleDetect = formData.householdRole === "child" && formData.maritalStatus === "single"
    const shouldSilentDetect = formData.householdRole !== "child" && formData.maritalStatus !== "single"
    const shouldApply = shouldVisibleDetect || shouldSilentDetect
    if (!shouldApply || !familyMatchedHead) {
      if (!shouldSilentDetect) {
        setAutoFamilyLinkNote("")
      }
      return
    }

    const fatherDetected = `${familyMatchedHead.firstName} ${familyMatchedHead.fatherName} ${familyMatchedHead.grandFatherName}`.trim()
    const motherDetected = familyMatchedMother
      ? `${familyMatchedMother.firstName} ${familyMatchedMother.fatherName} ${familyMatchedMother.grandFatherName}`.trim()
      : ""

    setFormData((prev) => ({
      ...prev,
      fatherResidentId: familyMatchedHead.id,
      motherResidentId: familyMatchedMother?.id ?? prev.motherResidentId,
      linkedHeadResidentId: shouldVisibleDetect ? familyMatchedHead.id : prev.linkedHeadResidentId,
      householdId: shouldVisibleDetect && familyMatchedHead.householdId ? familyMatchedHead.householdId : prev.householdId,
      zoneId: shouldVisibleDetect && familyMatchedHead.zoneId ? familyMatchedHead.zoneId : prev.zoneId,
      woredaId: shouldVisibleDetect && familyMatchedHead.woredaId ? familyMatchedHead.woredaId : prev.woredaId,
      kebeleId: shouldVisibleDetect && familyMatchedHead.kebeleId ? familyMatchedHead.kebeleId : prev.kebeleId,
      fatherNameDetected: fatherDetected,
      motherNameDetected: motherDetected,
      motherName: shouldVisibleDetect ? motherDetected || prev.motherName : prev.motherName,
    }))

    if (shouldSilentDetect) {
      setAutoFamilyLinkNote("Family linkage auto-detected and attached silently.")
    } else {
      setAutoFamilyLinkNote("")
    }
  }, [familyMatchedHead, familyMatchedMother, formData.householdRole, formData.maritalStatus])

  const updateField = (field: string, value: string) => {
    if (field === "householdId") {
      setHouseholdValidation("idle")
      setHouseholdValidationMessage("")
    }
    setFormData((prev) => {
      const next: Record<string, string> = { ...prev, [field]: value }
      if (field === "zoneId") {
        next.woredaId = ""
        next.kebeleId = ""
      }
      if (field === "woredaId") {
        next.kebeleId = ""
      }
      if (field === "householdRole" && value === "head") {
        next.linkedHeadResidentId = ""
        next.motherName = ""
        if (householdMode === "new" && !next.householdId) {
          next.householdId = generateHouseholdId()
        }
      }
      if (field === "maritalStatus" && value === "single") {
        next.spouseResidentId = ""
        next.spouseFirstName = ""
        next.spouseFatherName = ""
        next.spouseGrandFatherName = ""
        next.childrenNames = ""
        setChildSearchQuery("")
      }
      if (field === "spouseResidentId") {
        const selectedSpouse = residentOptions.find((r) => r.id === value)
        if (selectedSpouse) {
          next.spouseFirstName = selectedSpouse.firstName
          next.spouseFatherName = selectedSpouse.fatherName
          next.spouseGrandFatherName = selectedSpouse.grandFatherName
        } else {
          next.spouseFirstName = ""
          next.spouseFatherName = ""
          next.spouseGrandFatherName = ""
        }
      }
      if (field === "householdRole" && value !== "head" && next.linkedHeadResidentId) {
        const selectedHead = heads.find((h) => h.id === next.linkedHeadResidentId)
        if (selectedHead) next.householdId = selectedHead.householdId
      }
      if (field === "linkedHeadResidentId") {
        const selectedHead = heads.find((h) => h.id === value)
        if (selectedHead) {
          next.householdId = selectedHead.householdId
          next.zoneId = selectedHead.zoneId
          next.woredaId = selectedHead.woredaId
          next.kebeleId = selectedHead.kebeleId
          if (next.householdRole === "child") {
            const probableMother = residentOptions.find(
              (r) => r.householdId === selectedHead.householdId && r.householdRole === "spouse" && r.gender === "female",
            )
            if (probableMother) {
              next.motherName = `${probableMother.firstName} ${probableMother.fatherName} ${probableMother.grandFatherName}`.trim()
            }
          }
        }
      }
      return next as typeof formData
    })

    if (field === "linkedHeadResidentId" && value) {
      setHouseholdMode("existing")
      setHouseholdValidation("valid")
      setHouseholdValidationMessage("Linked to selected family head household.")
    }
  }

  const onPhotoChange = async (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : ""
      setFormData((prev) => ({ ...prev, photoUrl: value }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (householdMode === "existing") {
      const ok = await validateHouseholdId({ showToast: true })
      if (!ok) {
        setSubmitError("Please provide a valid existing household ID.")
        return
      }
    }

    const resolvedHouseholdId =
      householdMode === "new" && formData.householdRole === "head"
        ? formData.householdId || generateHouseholdId()
        : formData.householdId

    setIsSubmitting(true)
    setSubmitError(null)
    setFaceFeedback(null)
    const res = await fetch("/api/residents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.firstName,
        fatherName: formData.fatherName,
        grandFatherName: formData.grandFatherName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        nationality: formData.nationality,
        ethnicity: formData.ethnicity,
        religion: formData.religion,
        occupation: formData.occupation,
        email: formData.email,
        zoneId: formData.zoneId,
        woredaId: formData.woredaId,
        kebeleId: formData.kebeleId,
        phoneNumber: formData.phoneNumber,
        householdId: resolvedHouseholdId || undefined,
        householdRole: formData.householdRole || undefined,
        linkedHeadResidentId: formData.linkedHeadResidentId || undefined,
        motherName: formData.motherName || undefined,
        spouseResidentId: formData.spouseResidentId || undefined,
        spouseName: [formData.spouseFirstName, formData.spouseFatherName, formData.spouseGrandFatherName]
          .map((value) => value.trim())
          .filter(Boolean)
          .join(" ") || undefined,
        spouseNameParts: formData.spouseFirstName
          ? {
              firstName: formData.spouseFirstName,
              fatherName: formData.spouseFatherName,
              grandFatherName: formData.spouseGrandFatherName,
            }
          : undefined,
        childrenNames: formData.childrenNames
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean),
        fatherResidentId: formData.fatherResidentId || undefined,
        motherResidentId: formData.motherResidentId || undefined,
        photoUrl: formData.photoUrl || undefined,
        address: {
          city: formData.city,
          subcity: formData.subcity,
          streetName: formData.streetName,
          houseNumber: formData.houseNumber,
          relatives: relatives.length > 0 ? relatives : undefined,
        },
      }),
    })
    setIsSubmitting(false)
    const payload = await res.json().catch(() => null)
    if (!res.ok) {
      setSubmitError(payload?.error ?? "Failed to register resident")
      return
    }

    setFaceFeedback({
      status: payload?.faceStatus ?? "pending",
      error: payload?.faceError ?? null,
      match: payload?.faceMatch ?? null,
    })

    setTimeout(() => {
      router.push("/residents")
    }, 1200)
  }

  const validateStep = (step: SectionKey) => isStepComplete(step, formData)
  const completedSteps = sectionOrder.filter((step) => validateStep(step)).length
  const progressPct = Math.round((completedSteps / sectionOrder.length) * 100)
  const canOpenStep = (step: SectionKey) => {
    const idx = sectionOrder.indexOf(step)
    if (idx <= 0) return true
    return sectionOrder.slice(0, idx).every((s) => validateStep(s))
  }

  const currentIndex = sectionOrder.indexOf(activeSection)
  const isLastStep = currentIndex === sectionOrder.length - 1
  const goNext = () => {
    if (!validateStep(activeSection)) return
    const next = sectionOrder[currentIndex + 1]
    if (next) setActiveSection(next)
  }
  const goPrev = () => {
    const prev = sectionOrder[currentIndex - 1]
    if (prev) setActiveSection(prev)
  }

  return (
    <PageShell
      title="Register New Resident"
      hideHeader
      actions={
        <Link href="/residents">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Residents
          </Button>
        </Link>
      }
    >
      <OpsPageIntro
        eyebrow="Registration Workflow"
        title="Step-by-step resident intake"
        description="Capture identity, contact details, administrative scope, and household context in sequence to keep registration quality high and prevent partial records."
        links={[
          { label: "All Residents", href: "/residents", icon: Search },
          { label: "Register New", href: "/residents/new", icon: UserPlus },
          { label: "Pending Queue", href: "/residents/pending", icon: CheckCircle2 },
        ]}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <div className="rounded-none border border-slate-300/80 bg-white/90 p-3 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Registration Progress</p>
                <p className="text-xs font-semibold text-slate-700">{completedSteps}/{sectionOrder.length} complete</p>
              </div>
              <div className="mb-3 h-1.5 w-full overflow-hidden bg-slate-200">
                <div className="h-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                {sectionOrder.map((section, index) => {
                  const isActive = activeSection === section
                  const complete = validateStep(section)
                  const enabled = canOpenStep(section)
                  return (
                    <button
                      key={section}
                      type="button"
                      onClick={() => enabled && setActiveSection(section)}
                      disabled={!enabled}
                      className={`rounded-none border px-3 py-2 text-left text-sm font-medium transition ${
                        isActive
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-[inset_0_-2px_0_0_#059669]"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.08em] opacity-75">Step {index + 1}</p>
                      <p className="mt-0.5">{sectionLabels[section]}</p>
                      {complete && <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3 w-3" />Complete</span>}
                    </button>
                  )
                })}
              </div>
            </div>

        {activeSection === "personal" && (
          <Card className="rounded-none border-slate-300/80 bg-white/90 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
            <CardHeader>
              <CardTitle>1. Personal Information</CardTitle>
              <CardDescription>Identity and demographic details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>First Name</Label><Input className="rounded-none" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Father Name</Label><Input className="rounded-none" value={formData.fatherName} onChange={(e) => updateField("fatherName", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Grand Father Name</Label><Input className="rounded-none" value={formData.grandFatherName} onChange={(e) => updateField("grandFatherName", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input className="rounded-none" type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} required /></div>
              <div className="space-y-2"><Label>Gender</Label><Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}><SelectTrigger className="rounded-none"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Marital Status</Label><Select value={formData.maritalStatus} onValueChange={(v) => updateField("maritalStatus", v)} disabled={!!matchedSpouseHead}><SelectTrigger className="rounded-none"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem><SelectItem value="separated">Separated</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Nationality</Label><Input className="rounded-none" value={formData.nationality} onChange={(e) => updateField("nationality", e.target.value)} /></div>
              <div className="space-y-2"><Label>Ethnicity</Label><Input className="rounded-none" value={formData.ethnicity} onChange={(e) => updateField("ethnicity", e.target.value)} /></div>
              <div className="space-y-2"><Label>Religion</Label><Input className="rounded-none" value={formData.religion} onChange={(e) => updateField("religion", e.target.value)} /></div>
              <div className="space-y-2"><Label>Occupation</Label><Input className="rounded-none" value={formData.occupation} onChange={(e) => updateField("occupation", e.target.value)} /></div>
            </CardContent>
          </Card>
        )}

        {activeSection === "contact" && (
          <Card className="rounded-none border-slate-300/80 bg-white/90 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
            <CardHeader>
              <CardTitle>2. Contact and Address</CardTitle>
              <CardDescription>Reachability and physical location</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Email</Label><Input className="rounded-none" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} /></div>
              <div className="space-y-2"><Label>Phone Number</Label><Input className="rounded-none" value={formData.phoneNumber} onChange={(e) => updateField("phoneNumber", e.target.value)} /></div>
              <div className="space-y-2"><Label>City</Label><Input className="rounded-none" value={formData.city} onChange={(e) => updateField("city", e.target.value)} /></div>
              <div className="space-y-2"><Label>Subcity</Label><Input className="rounded-none" value={formData.subcity} onChange={(e) => updateField("subcity", e.target.value)} /></div>
              <div className="space-y-2"><Label>Street Name</Label><Input className="rounded-none" value={formData.streetName} onChange={(e) => updateField("streetName", e.target.value)} /></div>
              <div className="space-y-2"><Label>House Number</Label><Input className="rounded-none" value={formData.houseNumber} onChange={(e) => updateField("houseNumber", e.target.value)} /></div>
            </CardContent>
          </Card>
        )}

        {activeSection === "administrative" && (
          <Card className="rounded-none border-slate-300/80 bg-white/90 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
            <CardHeader>
              <CardTitle>3. Administrative Scope</CardTitle>
              <CardDescription>Zone, woreda, kebele assignment</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Zone</Label><Select value={formData.zoneId} onValueChange={(v) => updateField("zoneId", v)}><SelectTrigger className="rounded-none"><SelectValue placeholder="Select zone" /></SelectTrigger><SelectContent>{zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Woreda</Label><Select value={formData.woredaId} onValueChange={(v) => updateField("woredaId", v)}><SelectTrigger className="rounded-none"><SelectValue placeholder="Select woreda" /></SelectTrigger><SelectContent>{availableWoredas.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Kebele</Label><Select value={formData.kebeleId} onValueChange={(v) => updateField("kebeleId", v)}><SelectTrigger className="rounded-none"><SelectValue placeholder="Select kebele" /></SelectTrigger><SelectContent>{availableKebeles.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent></Select></div>
            </CardContent>
          </Card>
        )}

        {activeSection === "household" && (
          <Card className="rounded-none border-slate-300/80 bg-white/90 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
            <CardHeader>
              <CardTitle>4. Household and Photo</CardTitle>
              <CardDescription>Household linkage and profile photo</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {matchedSpouseHead && (
                <div className="md:col-span-3 rounded-none border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {spouseLockReason}. Marital status and household linkage are locked automatically.
                </div>
              )}
              <div className="space-y-2">
                <Label>Household Choice</Label>
                <Select
                  value={householdMode}
                  onValueChange={(value) => setHouseholdMode(value as "new" | "existing")}
                  disabled={!!matchedSpouseHead || (formData.householdRole ? formData.householdRole !== "head" : false)}
                >
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Select household mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="existing">Existing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Household ID</Label>
                <div className="flex gap-2">
                  <Input
                    className="rounded-none"
                    value={formData.householdId}
                    onChange={(e) => updateField("householdId", e.target.value)}
                    onBlur={() => {
                      if (householdMode === "existing" && formData.householdId.trim()) {
                        void validateHouseholdId({ showToast: false })
                      }
                    }}
                    placeholder={householdMode === "new" ? "Auto-generated household ID" : "Enter existing household ID"}
                    readOnly={householdMode === "new"}
                    disabled={!!matchedSpouseHead}
                  />
                  {householdMode === "new" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        const nextId = generateHouseholdId()
                        updateField("householdId", nextId)
                        toast.success("New household ID generated.")
                      }}
                      disabled={!!matchedSpouseHead}
                    >
                      Regenerate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => void validateHouseholdId({ showToast: true })}
                      disabled={!!matchedSpouseHead || !formData.householdId.trim()}
                    >
                      Validate
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Validation</Label>
                <div
                  className={`flex h-10 items-center gap-2 rounded-none border px-3 text-sm ${
                    householdValidation === "valid"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : householdValidation === "invalid"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-slate-300 bg-slate-50 text-slate-700"
                  }`}
                >
                  {householdValidation === "checking" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {householdValidation === "valid" && <CheckCircle2 className="h-4 w-4" />}
                  {householdValidation === "invalid" && <AlertCircle className="h-4 w-4" />}
                  <span>
                    {householdMode === "new"
                      ? "New household will be created with this ID."
                      : householdValidationMessage || "Enter an existing household ID and validate."}
                  </span>
                </div>
              </div>
              {householdMode === "existing" && householdValidation === "invalid" && (
                <div className="md:col-span-3 rounded-none border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {householdValidationMessage || "Invalid household ID."}
                </div>
              )}
              <div className="space-y-2">
                <Label>Household Role</Label>
                <Select value={formData.householdRole} onValueChange={(v) => updateField("householdRole", v)} disabled={!!matchedSpouseHead}>
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {allowedHouseholdRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role[0].toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.householdRole && formData.householdRole !== "head" && (
                <div className="space-y-2">
                  <Label>Family Head</Label>
                  <Select value={formData.linkedHeadResidentId} onValueChange={(v) => updateField("linkedHeadResidentId", v)} disabled={!!matchedSpouseHead}>
                    <SelectTrigger className="rounded-none"><SelectValue placeholder="Select head of household" /></SelectTrigger>
                    <SelectContent>
                      {availableHeads.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.firstName} {h.fatherName} {h.grandFatherName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.householdRole === "child" && (
                <div className="space-y-2">
                  <Label>Mother Name (Auto-linked)</Label>
                  <Input
                    className="rounded-none"
                    value={formData.motherName}
                    onChange={(e) => updateField("motherName", e.target.value)}
                    placeholder="Auto-filled from linked family, editable if needed"
                  />
                </div>
              )}
              {formData.householdRole === "child" && formData.maritalStatus === "single" && formData.fatherNameDetected && (
                <>
                  <div className="space-y-2 md:col-span-3 rounded-none border border-emerald-300/80 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Parent links were auto-detected from existing family records.
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Father First Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.fatherNameDetected.split(" ")[0] ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Father Father Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.fatherNameDetected.split(" ")[1] ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Father Grand Father Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.fatherNameDetected.split(" ").slice(2).join(" ") ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Mother First Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.motherNameDetected.split(" ")[0] ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Mother Father Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.motherNameDetected.split(" ")[1] ?? ""} readOnly />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Mother Grand Father Name (Detected)</Label>
                    <Input className="rounded-none" value={formData.motherNameDetected.split(" ").slice(2).join(" ") ?? ""} readOnly />
                  </div>
                </>
              )}
              {autoFamilyLinkNote && (
                <div className="md:col-span-3 rounded-none border border-sky-300/80 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  {autoFamilyLinkNote}
                </div>
              )}
              {formData.householdRole === "head" && formData.maritalStatus !== "single" && (
                <>
                  <div className="space-y-4 md:col-span-3">
                    <div className="space-y-2">
                      <Label>Spouse (If already registered)</Label>
                      <Input
                        className="rounded-none"
                        value={spouseSearchQuery}
                        onChange={(e) => setSpouseSearchQuery(e.target.value)}
                        placeholder="Search spouse by first, father, or grand father name"
                      />
                      <div className="max-h-40 overflow-y-auto rounded-none border border-slate-300/80 bg-slate-50">
                        {!spouseSearchQuery.trim() ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            Start typing to search registered spouses.
                          </div>
                        ) : filteredSpouseOptions.length > 0 ? (
                          filteredSpouseOptions.map((resident) => (
                            <button
                              key={resident.id}
                              type="button"
                              className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-100"
                              onClick={() => {
                                updateField("spouseResidentId", resident.id)
                                setSpouseSearchQuery(
                                  `${resident.firstName} ${resident.fatherName} ${resident.grandFatherName}`.trim(),
                                )
                              }}
                            >
                              <span>{resident.firstName} {resident.fatherName} {resident.grandFatherName}</span>
                              <span className="text-xs text-muted-foreground">Select</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No matching spouse found.</div>
                        )}
                      </div>
                      {formData.spouseResidentId ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => {
                            updateField("spouseResidentId", "")
                            setSpouseSearchQuery("")
                          }}
                        >
                          Clear selected registered spouse
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Spouse First Name (Required)</Label>
                        <Input
                          className="rounded-none"
                          value={formData.spouseFirstName}
                          onChange={(e) => updateField("spouseFirstName", e.target.value)}
                          placeholder="First name"
                          required={formData.householdRole === "head" && formData.maritalStatus !== "single"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Spouse Father Name (Required)</Label>
                        <Input
                          className="rounded-none"
                          value={formData.spouseFatherName}
                          onChange={(e) => updateField("spouseFatherName", e.target.value)}
                          placeholder="Father name"
                          required={formData.householdRole === "head" && formData.maritalStatus !== "single"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Spouse Grand Father Name (Required)</Label>
                        <Input
                          className="rounded-none"
                          value={formData.spouseGrandFatherName}
                          onChange={(e) => updateField("spouseGrandFatherName", e.target.value)}
                          placeholder="Grand father name"
                          required={formData.householdRole === "head" && formData.maritalStatus !== "single"}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Search Child (Optional)</Label>
                    <Input
                      className="rounded-none"
                      value={childSearchQuery}
                      onChange={(e) => setChildSearchQuery(e.target.value)}
                      placeholder="Search child by first, father, or grand father name"
                    />
                    {childSearchQuery.trim() ? (
                      <div className="max-h-40 overflow-y-auto rounded-none border border-slate-300/80 bg-slate-50">
                        {childSearchResults.length > 0 ? (
                          childSearchResults.map((resident) => (
                            <button
                              key={resident.id}
                              type="button"
                              className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-100"
                              onClick={() => {
                                const names = formData.childrenNames
                                  .split("\n")
                                  .map((name) => name.trim())
                                  .filter(Boolean)
                                if (!names.includes(resident.firstName)) {
                                  updateField("childrenNames", [...names, resident.firstName].join("\n"))
                                }
                                setChildSearchQuery("")
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
                  <div className="space-y-2 md:col-span-3">
                    <Label>Children Names (Optional)</Label>
                    <Textarea
                      className="rounded-none"
                      value={formData.childrenNames}
                      onChange={(e) => updateField("childrenNames", e.target.value)}
                      placeholder="One child name per line"
                    />
                  </div>
                </>
              )}
              {formData.householdRole === "head" && (
                <>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Relative First Name</Label>
                    <Input className="rounded-none" value={relativeDraft.firstName} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Relative Father Name</Label>
                    <Input className="rounded-none" value={relativeDraft.fatherName} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, fatherName: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Relative Grand Father Name</Label>
                    <Input className="rounded-none" value={relativeDraft.grandFatherName} onChange={(e) => setRelativeDraft((prev) => ({ ...prev, grandFatherName: e.target.value }))} />
                  </div>
                  <div className="md:col-span-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        const entry = {
                          firstName: relativeDraft.firstName.trim(),
                          fatherName: relativeDraft.fatherName.trim(),
                          grandFatherName: relativeDraft.grandFatherName.trim(),
                        }
                        if (!entry.firstName || !entry.fatherName || !entry.grandFatherName) return
                        setRelatives((prev) => [...prev, entry])
                        setRelativeDraft({ firstName: "", fatherName: "", grandFatherName: "" })
                      }}
                    >
                      Add Relative
                    </Button>
                  </div>
                  {relatives.length > 0 && (
                    <div className="md:col-span-3 space-y-2">
                      <Label>Added Relatives</Label>
                      <div className="rounded-none border border-slate-300/80 bg-slate-50">
                        {relatives.map((relative, index) => (
                          <div key={`${relative.firstName}-${relative.fatherName}-${relative.grandFatherName}-${index}`} className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-sm last:border-b-0">
                            <span>{relative.firstName} {relative.fatherName} {relative.grandFatherName}</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={() => setRelatives((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label>Photo Upload</Label>
                <Input className="rounded-none" type="file" accept="image/*" onChange={(e) => void onPhotoChange(e.target.files?.[0] ?? null)} />
                {formData.photoUrl && (
                  <img src={formData.photoUrl} alt="Preview" className="h-20 w-20 rounded-none border object-cover" />
                )}
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Address Notes</Label>
                <Textarea className="rounded-none" value={`${formData.city} ${formData.subcity} ${formData.streetName} ${formData.houseNumber}`.trim()} readOnly />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200/80 pt-4">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
              Previous
            </Button>
            {!isLastStep && (
              <Button type="button" onClick={goNext} disabled={!validateStep(activeSection)}>
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-3">
          <Link href="/residents"><Button type="button" variant="outline">Cancel</Button></Link>
          {isLastStep && (
            <Button type="submit" disabled={isSubmitting || !validateStep("household")}>
              {isSubmitting ? <Save className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Saving..." : "Register Resident"}
            </Button>
          )}
          </div>
        </div>
            {submitError && (
              <div className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
            )}
            {faceFeedback && (
              <div className="space-y-1 border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p>
                  Face processing: <span className="font-medium">{faceFeedback.status}</span>
                </p>
                {faceFeedback.error && <p className="text-red-700">{faceFeedback.error}</p>}
                {faceFeedback.match && (
                  <p className="text-amber-700">
                    Similar face detected ({Math.round((faceFeedback.match.similarity ?? 0) * 1000) / 10}%) with resident{" "}
                    {faceFeedback.match.residentId}. Decision: {faceFeedback.match.decision}.
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-3 rounded-none border border-slate-300/80 bg-white/90 p-3 shadow-[0_14px_34px_-26px_hsl(var(--foreground)/0.55)]">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Live Summary</p>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-medium text-slate-800">
                    {[formData.firstName, formData.fatherName, formData.grandFatherName].filter(Boolean).join(" ") || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium text-slate-800">
                    {formData.zoneId && formData.woredaId && formData.kebeleId
                      ? "Administrative scope selected"
                      : "Incomplete"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Household Role</p>
                  <p className="font-medium capitalize text-slate-800">{formData.householdRole || "Not selected"}</p>
                </div>
                {formData.householdRole === "head" && formData.maritalStatus !== "single" && (
                  <div>
                    <p className="text-xs text-slate-500">Spouse</p>
                    <p className="font-medium text-slate-800">
                      {[formData.spouseFirstName, formData.spouseFatherName, formData.spouseGrandFatherName].filter(Boolean).join(" ") || "Not provided"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Photo</p>
                  <p className="font-medium text-slate-800">{formData.photoUrl ? "Attached" : "Not attached"}</p>
                </div>
              </div>
              {formData.photoUrl && (
                <img src={formData.photoUrl} alt="Preview" className="h-24 w-24 border border-slate-300 object-cover" />
              )}
            </div>
          </aside>
        </div>
      </form>
    </PageShell>
  )
}
