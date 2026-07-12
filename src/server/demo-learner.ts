/**
 * @deprecated Prefer resolveProfileId from profile.
 * Kept so older imports still resolve to the explicitly selected profile;
 * this compatibility helper never creates a random profile.
 */
export { resolvePublicLearnerId as getDemoLearnerId } from "@/server/public-learner";
