"use client";

import Link from "next/link";
import { Copy, Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ResidentDetailActionsProps = {
  residentId: string;
  householdId?: string | null;
  fullName: string;
  idNumber?: string | null;
  status: string;
  phoneNumber?: string | null;
  email?: string | null;
};

export function ResidentDetailActions({
  residentId,
  householdId,
  fullName,
  idNumber,
  status,
  phoneNumber,
  email,
}: ResidentDetailActionsProps) {
  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(
        `Resident: ${fullName}\nRecord ID: ${residentId}\nID Number: ${idNumber ?? "Pending"}\nStatus: ${status}`,
      );
      toast.success("Resident reference copied");
    } catch {
      toast.error("Failed to copy reference");
    }
  };

  const downloadSnapshot = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      residentId,
      fullName,
      idNumber: idNumber ?? null,
      status,
      phoneNumber: phoneNumber ?? null,
      email: email ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resident-${residentId}-snapshot.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button className="h-9 rounded-none" variant="outline" onClick={() => void copyRef()}>
        <Copy className="mr-2 h-4 w-4" />
        Copy Reference
      </Button>
      <Button className="h-9 rounded-none" variant="outline" onClick={() => downloadSnapshot()}>
        <Download className="mr-2 h-4 w-4" />
        Download JSON
      </Button>
      <Button className="h-9 rounded-none" variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Link href={`/id-cards/${residentId}`}>
        <Button className="h-9 rounded-none" variant="outline">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open ID Card
        </Button>
      </Link>
      {householdId && (
        <Link href={`/households/${householdId}`}>
          <Button className="h-9 rounded-none" variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Household
          </Button>
        </Link>
      )}
    </div>
  );
}
