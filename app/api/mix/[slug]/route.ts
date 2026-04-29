import { getMix } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const mix = await getMix(params.slug);
  if (!mix) return NextResponse.json({ error: "Mix not found" }, { status: 404 });
  return NextResponse.json(mix);
}
