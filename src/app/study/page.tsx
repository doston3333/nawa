import { StudyRoom } from "@/features/study-room/study-room";
import { redirect } from "next/navigation";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";

export default async function StudyPage() {
  try {
    await resolveProfileId();
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) redirect("/profiles");
    throw error;
  }
  return <StudyRoom durationMinutes={60} />;
}
