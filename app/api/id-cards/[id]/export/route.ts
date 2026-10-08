import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { db } from "@/lib/db";
import { canAccessLocation, requirePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto ?? "http"}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(request, "id:generate");
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const resident = await db.resident.findUnique({
      where: { id },
      select: {
        id: true,
        idNumber: true,
        zoneId: true,
        woredaId: true,
        kebeleId: true,
      },
    });

    if (!resident || !resident.idNumber) {
      return NextResponse.json({ error: "ID card not found" }, { status: 404 });
    }

    if (
      !canAccessLocation(auth.user, {
        zoneId: resident.zoneId,
        woredaId: resident.woredaId,
        kebeleId: resident.kebeleId,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const exportFormat = (request.nextUrl.searchParams.get("format") || "png").toLowerCase();
    const cardUrl = new URL(`/id-cards/${resident.id}`, getBaseUrl(request));
    cardUrl.searchParams.set("pdf", "1");

    const browser = await chromium.launch({ headless: true });

    try {
      const context = await browser.newContext({
        viewport: { width: 1400, height: 1000 },
        extraHTTPHeaders: {
          cookie: request.headers.get("cookie") ?? "",
        },
      });

      const page = await context.newPage();
      await page.emulateMedia({ media: "screen" });
      await page.goto(cardUrl.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector(".print-two-cards", { timeout: 45000 });
      await page.waitForSelector(".print-card-slot", { timeout: 45000 });
      await page.waitForTimeout(600);

      if (exportFormat === "pdf") {
        const pdf = await page.pdf({
          format: "A4",
          landscape: true,
          printBackground: true,
          preferCSSPageSize: true,
          margin: {
            top: "10mm",
            right: "10mm",
            bottom: "10mm",
            left: "10mm",
          },
        });

        await context.close();

        return new NextResponse(Buffer.from(pdf), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="id-card-${resident.idNumber}.pdf"`,
            "Cache-Control": "no-store",
          },
        });
      }

      const cardsLocator = page.locator(".print-two-cards");
      const png = await cardsLocator.screenshot({
        type: "png",
      });

      await context.close();

      return new NextResponse(Buffer.from(png), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="id-card-${resident.idNumber}-front-back.png"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("ID card export failed:", error);
    return NextResponse.json({ error: "ID card export failed" }, { status: 500 });
  }
}
