import { NextResponse } from "next/server";
import { createRuntimeProviders } from "@/domain/providers/runtime-providers";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ cards: [] });

  const providers = createRuntimeProviders();
  if (!providers.ok) {
    return NextResponse.json({ error: providers.error.message, code: providers.error.code }, { status: 400 });
  }

  try {
    const cards = await providers.value.catalog.search(query);
    return NextResponse.json({
      cards,
      providerMode: providers.value.mode,
      providerWarnings: providers.value.warnings,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Card provider request failed",
      detail: error instanceof Error ? error.message : "Unknown provider error",
    }, { status: 502 });
  }
}
