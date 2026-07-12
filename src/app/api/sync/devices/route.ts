import { NextResponse } from "next/server";
import { z } from "zod";
import { DeviceOwnershipError, registerDevice } from "@/server/device";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";

const bodySchema = z.object({
  deviceId: z.uuid(),
  label: z.string().trim().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid device registration payload" }, { status: 400 });
  try {
    const profileId = await resolveProfileId();
    const device = await registerDevice({ profileId, deviceId: parsed.data.deviceId, label: parsed.data.label || "Browser" });
    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) {
      return NextResponse.json({ error: "Select a profile before registering a device", code: error.code }, { status: 400 });
    }
    if (error instanceof DeviceOwnershipError) {
      return NextResponse.json({ error: error.message, code: "DEVICE_MISMATCH" }, { status: 403 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register device" }, { status: 503 });
  }
}
