"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type KebeleRow = {
  kebele: {
    id: string;
    name: string;
    code: string;
    updatedAt: string;
    householdCount: number;
  };
  woredaName: string | null;
  zoneName: string | null;
  kebeleAdminsCount: number;
  population: number;
};

export function KebelesTable({ rows }: { rows: KebeleRow[] }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("admin:kebeles");
  const [localRows, setLocalRows] = useState<KebeleRow[]>(rows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const rowById = useMemo(() => new Map(localRows.map((row) => [row.kebele.id, row])), [localRows]);

  const openEditor = (id: string) => {
    const row = rowById.get(id);
    if (!row) return;
    setEditingId(id);
    setDraftName(row.kebele.name);
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveName = async (id: string) => {
    const nextName = draftName.trim();
    const row = rowById.get(id);
    if (!row) return;
    if (!nextName) {
      toast.error("Kebele name is required.");
      return;
    }
    if (nextName === row.kebele.name) {
      closeEditor();
      return;
    }

    setSavingId(id);
    const res = await fetch("/api/geography", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: "kebele",
        id,
        name: nextName,
      }),
    });
    setSavingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update kebele name.");
      return;
    }

    setLocalRows((prev) =>
      prev.map((entry) =>
        entry.kebele.id === id
          ? {
              ...entry,
              kebele: {
                ...entry.kebele,
                name: nextName,
                updatedAt: new Date().toISOString(),
              },
            }
          : entry,
      ),
    );
    closeEditor();
    toast.success("Kebele name updated.");
  };

  return (
    <div className="overflow-x-auto rounded-none border border-border/70">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead>Kebele</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Hierarchy</TableHead>
            <TableHead>Population</TableHead>
            <TableHead>Households</TableHead>
            <TableHead>Admins</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {localRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                No kebele records available yet.
              </TableCell>
            </TableRow>
          ) : (
            localRows.map((row) => {
              const isEditing = editingId === row.kebele.id;
              const isSaving = savingId === row.kebele.id;

              return (
                <TableRow key={row.kebele.id}>
                  <TableCell>
                    <div className="space-y-1">
                      {isEditing ? (
                        <Input
                          className="h-8 rounded-none"
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          placeholder="Kebele name"
                          disabled={isSaving}
                        />
                      ) : (
                        <p className="font-medium">{row.kebele.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(row.kebele.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.kebele.code}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{row.woredaName ?? "Unassigned Woreda"}</p>
                      <p className="text-xs text-muted-foreground">{row.zoneName ?? "Unassigned Zone"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{row.population.toLocaleString()}</TableCell>
                  <TableCell>{row.kebele.householdCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{row.kebeleAdminsCount} kebele admins</p>
                      <p className="text-xs text-muted-foreground">
                        {row.kebeleAdminsCount > 0 ? "Assigned" : "Needs staffing"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        row.kebeleAdminsCount > 0 && row.zoneName && row.woredaName
                          ? "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
                          : "rounded-none border border-amber-300/80 bg-amber-50 text-amber-800"
                      }
                    >
                      {row.kebeleAdminsCount > 0 && row.zoneName && row.woredaName ? "Operational" : "Needs Attention"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && !isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-none"
                        onClick={() => openEditor(row.kebele.id)}
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {canEdit && isEditing && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="h-8 rounded-none"
                          onClick={() => void saveName(row.kebele.id)}
                          disabled={isSaving}
                        >
                          <Save className="mr-2 h-3.5 w-3.5" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-none"
                          onClick={closeEditor}
                          disabled={isSaving}
                        >
                          <X className="mr-2 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
