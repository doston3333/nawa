import { NextResponse } from "next/server";
import { z } from "zod";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";
import { pushMutations, type SyncMutationInput } from "@/server/sync";

const mutationSchema = z.object({
  mutationId: z.uuid(),
  profileId: z.uuid(),
  deviceId: z.uuid(),
  kind: z.enum(["STUDY_ATTEMPT", "LESSON_PROGRESS"]),
  baseRevision: z.number().int().nonnegative().nullable(),
  createdAt: z.iso.datetime(),
  payload: z.unknown(),
});
const bodySchema = z.object({ mutations: z.array(mutationSchema).max(50), deviceId: z.uuid().optional() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sync push payload" }, { status: 400 });
  try {
    const profileId = await resolveProfileId();
    if (parsed.data.mutations.some((mutation) => mutation.profileId !== profileId)) {
      return NextResponse.json({ error: "Every mutation must belong to the active profile" }, { status: 403 });
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to push sync mutations" }, { status: 503 });
  }
}
