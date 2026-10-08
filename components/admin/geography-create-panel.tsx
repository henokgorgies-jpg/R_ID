"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned, PlusCircle, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "zone" | "woreda" | "kebele";
type Zone = { id: string; name: string };
type Woreda = { id: string; zoneId: string; name: string };

export function GeographyCreatePanel({ mode }: { mode: Mode }) {
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [woredaId, setWoredaId] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canCreateZone = user?.role === "super_admin";
  const canCreateWoreda = user && ["super_admin", "zone_admin"].includes(user.role);
  const canCreateKebele = user && ["super_admin", "zone_admin", "woreda_admin"].includes(user.role);

  const canCreate =
    (mode === "zone" && canCreateZone) ||
    (mode === "woreda" && canCreateWoreda) ||
    (mode === "kebele" && canCreateKebele);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/geography", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setZones(data.zones ?? []);
      setWoredas(data.woredas ?? []);

      if (user?.role === "zone_admin" && user.scope.zoneId) setZoneId(user.scope.zoneId);
      if (user?.role === "woreda_admin" && user.scope.zoneId) setZoneId(user.scope.zoneId);
      if (user?.role === "woreda_admin" && user.scope.woredaId) setWoredaId(user.scope.woredaId);
    };
    void load();
  }, [user?.role, user?.scope.zoneId, user?.scope.woredaId]);

  const availableWoredas = useMemo(() => woredas.filter((w) => w.zoneId === zoneId), [woredas, zoneId]);

  if (!canCreate) return null;

  const onCreate = async () => {
    if (!name.trim()) return;
    if (mode !== "zone" && !zoneId) return;
    if (mode === "kebele" && !woredaId) return;
    setIsSaving(true);
    const res = await fetch("/api/geography", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: mode,
        zoneId: mode === "zone" ? undefined : zoneId,
        woredaId: mode === "kebele" ? woredaId : undefined,
        name: name.trim(),
      }),
    });
    setIsSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Create failed");
      return;
    }
    toast.success(`${mode} created`);
    window.location.reload();
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.05)_100%)] p-4 shadow-[0_18px_45px_-32px_hsl(var(--foreground)/0.5)]">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <MapPinned className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.08em]">Create {mode}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Add a new {mode} and attach it to the correct geography chain before it enters operations.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-none border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <Workflow className="h-3.5 w-3.5" />
          <span>Codes are generated automatically</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {(mode === "woreda" || mode === "kebele") && (
          <div className="space-y-1.5 md:col-span-2">
            <Label>Zone</Label>
            <Select value={zoneId} onValueChange={(v) => { setZoneId(v); setWoredaId(""); }}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="Select zone" /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === "kebele" && (
          <div className="space-y-1.5 md:col-span-2">
            <Label>Woreda</Label>
            <Select value={woredaId} onValueChange={setWoredaId}>
              <SelectTrigger className="rounded-none"><SelectValue placeholder="Select woreda" /></SelectTrigger>
              <SelectContent>
                {availableWoredas.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className={`space-y-1.5 ${mode === "zone" ? "md:col-span-4" : mode === "woreda" ? "md:col-span-3" : "md:col-span-2"}`}>
          <Label>Name</Label>
          <Input className="rounded-none" value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${mode} name`} />
        </div>
        <div className="flex items-end md:col-span-1">
          <Button className="w-full rounded-none" onClick={() => void onCreate()} disabled={isSaving}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : `Create ${mode}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
