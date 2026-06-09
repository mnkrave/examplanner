import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const file = await prisma.file.findUnique({
      where: { id },
      select: {
        name: true,
        mimeType: true,
        base64: true,
      },
    });

    if (!file) {
      return new Response("Datei nicht gefunden", { status: 404 });
    }

    const buffer = Buffer.from(file.base64, "base64");

    // Return buffer with inline content headers so the PDF opens directly in the browser
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new Response("Interner Serverfehler", { status: 500 });
  }
}
