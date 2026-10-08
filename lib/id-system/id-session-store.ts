import type { Resident } from "@/lib/data/types"

const STORAGE_KEY = "id_management_overrides_v1"
const UPDATE_EVENT = "id-overrides-updated"

type ResidentIdOverride = {
  residentId: string
  idNumber: string
  idIssuedDate: string
  idExpiryDate: string
  idStatus: "active" | "pending" | "expired" | "revoked" | "reissued"
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function readOverrides(): Record<string, ResidentIdOverride> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ResidentIdOverride>
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeOverrides(overrides: Record<string, ResidentIdOverride>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

export function upsertResidentIdOverride(
  residentId: string,
  payload: Omit<ResidentIdOverride, "residentId">
) {
  const current = readOverrides()
  current[residentId] = { residentId, ...payload }
  writeOverrides(current)
}

export function applyResidentIdOverrides(residents: Resident[]): Resident[] {
  const overrides = readOverrides()
  if (!Object.keys(overrides).length) return residents

  return residents.map((resident) => {
    const override = overrides[resident.id]
    if (!override) return resident
    return {
      ...resident,
      idNumber: override.idNumber,
      idIssuedDate: override.idIssuedDate,
      idExpiryDate: override.idExpiryDate,
      idStatus: override.idStatus,
    }
  })
}

export function subscribeIdOverridesUpdated(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(UPDATE_EVENT, callback)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(UPDATE_EVENT, callback)
  }
}

