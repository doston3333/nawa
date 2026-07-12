import { PathMap } from "@/features/learn/path-map";
import { redirect } from "next/navigation";
import { ProfileSelectionRequiredError, resolveProfileId } from "@/server/profile";

export default async function LearnPage() {
  try {
    await resolveProfileId();
  } catch (error) {
    if (error instanceof ProfileSelectionRequiredError) redirect("/profiles");
    throw error;
  }
  return <PathMap />;
}
