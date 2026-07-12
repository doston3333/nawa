import { db } from "@/server/db";

export interface DeviceSummary {
  id: string;
  profileId: string;
  label: string;
}

export class DeviceOwnershipError extends Error {
  constructor() {
    super("Device belongs to another profile");
    this.name = "DeviceOwnershipError";
  }
}

export async function registerDevice(input: { profileId: string; deviceId: string; label: string }): Promise<DeviceSummary> {
  const existing = await db.device.findUnique({ where: { id: input.deviceId }, select: { id: true, profileId: true, label: true } });
  if (existing && existing.profileId !== input.profileId) throw new DeviceOwnershipError();
  if (existing) {
    return db.device.update({
      where: { id: input.deviceId },
      data: { label: input.label, lastSeenAt: new Date() },
      select: { id: true, profileId: true, label: true },
    });
  }
  try {
    return await db.device.create({
      data: { id: input.deviceId, profileId: input.profileId, label: input.label },
      select: { id: true, profileId: true, label: true },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const raced = await db.device.findUnique({ where: { id: input.deviceId }, select: { id: true, profileId: true, label: true } });
      if (raced) {
        if (raced.profileId !== input.profileId) throw new DeviceOwnershipError();
        return raced;
      }
    }
    throw error;
  }
}
