import { ProfilePicker } from "@/features/profile/profile-picker";
import { listProfiles } from "@/server/profile";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const profiles = await listProfiles();
  return <ProfilePicker initialProfiles={profiles} />;
}
