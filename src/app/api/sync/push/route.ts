import { NextResponse } from "next/server";
import { z } from "zod";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { db } from "@/server/db";
import { pushMutations, SyncInputError, type SyncMutationInput } from "@/server/sync";

const mutationSchema = z.object({
  mutationId: z.uuid(),
  profileId: z.uuid(),
  deviceId: z.uuid(),
  kind: z.enum(["STUDY_ATTEMPT", "LESSON_PROGRESS"]),
  baseRevision: z.number().int().nonnegative().nullable(),
  createdAt: z.iso.datetime(),
  payload: z.unknown(),
});
const bodySchema = z.object({ mutations: z.array(mutationSchema).max(50), deviceId: z.uuid() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync push payload" }, { status: 400 });
  try {
    const profileId = await resolveProfileId();
    if (parsed.data.mutations.some((mutation) => mutation.profileId !== profileId)) {
      return NextResponse.json({ error: "Every mutation must belong to the active profile", code: "PROFILE_MISMATCH" }, { status: 403 });
    }
    if (parsed.data.mutations.some((mutation) => mutation.deviceId !== parsed.data.deviceId)) {
      return NextResponse.json({ error: "Every mutation must use the push device", code: "DEVICE_MISMATCH" }, { status: 403 });
    }
    const device = await db.device.findUnique({ where: { id: parsed.data.deviceId }, select: { profileId: true } });
    if (!device || device.profileId !== profileId) {
      return NextResponse.json({ error: "Device does not belong to the active profile", code: "DEVICE_MISMATCH" }, { status: 403 });
    }
    const result = await pushMutations({
      profileId,
      deviceId: parsed.data.deviceId,
      mutations: parsed.data.mutations as SyncMutationInput[],
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json({ error: "Select a profile before synchronizing", code: error.code }, { status: 400 });
    }
    if (error instanceof SyncInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to push sync mutations" }, { status: 503 });
  }
}
