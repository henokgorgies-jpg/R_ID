import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, residentScopeWhere } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll(`"`, `""`)}"`;
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(","));
  return lines.join("\n");
}

function toSimplePdfText(rows: Array<Record<string, unknown>>): Uint8Array {
  const body = rows
    .map((r, i) => `${i + 1}. ${r.name} | ${r.kebeleName} | ${r.status} | ${r.idNumber ?? "-"}`)
    .join("\\n");
  const text = `BT /F1 10 Tf 36 800 Td (Residents Export) Tj 0 -16 Td (${body.replace(/[()]/g, " ")}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let offset = 9;
  const parts: string[] = ["%PDF-1.4\n"];
  const xref: number[] = [0];
  for (const obj of objects) {
    xref.push(offset);
    parts.push(obj + "\n");
    offset += obj.length + 1;
  }
  const xrefStart = offset;
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i < xref.length; i++) parts.push(`${String(xref[i]).padStart(10, "0")} 00000 n \n`);
  parts.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
  return new TextEncoder().encode(parts.join(""));
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "residents:export");
  if (auth instanceof NextResponse) return auth;
  const format = request.nextUrl.searchParams.get("format") || "csv";

  try {
    const where = residentScopeWhere(auth.user);
    const residents = await db.resident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        fatherName: true,
        grandFatherName: true,
        status: true,
        idNumber: true,
        kebele: { select: { name: true } },
        createdAt: true,
      },
    });
    const rows = residents.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.fatherName} ${r.grandFatherName}`,
      kebeleName: r.kebele.name,
      status: r.status,
      idNumber: r.idNumber ?? "",
      createdAt: r.createdAt.toISOString(),
    }));
    if (format === "pdf") {
      return new NextResponse(toSimplePdfText(rows), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="residents-export.pdf"`,
        },
      });
    }
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="residents-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Residents export failed:", error);
    return NextResponse.json({ error: "Residents export failed" }, { status: 500 });
  }
}

