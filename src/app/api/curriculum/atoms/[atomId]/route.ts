import { NextResponse } from "next/server";
import { getAtomById } from "@/domain/curriculum/seed";

export async function GET(_request: Request, context: { params: Promise<{ atomId: string }> }) {
  const { atomId } = await context.params;
  const atom = getAtomById(atomId);
  if (!atom) {
    return NextResponse.json({ error: "Atom not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: atom.id,
    kind: atom.kind,
    register: atom.register,
    canonicalArabic: atom.canonicalArabic,
    vocalizedArabic: atom.vocalizedArabic,
    englishGloss: atom.englishGloss,
    root: atom.root ?? null,
    patternNote: atom.patternNote ?? null,
  });
}
