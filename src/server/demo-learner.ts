export function getDemoLearnerId(): string {
  if (process.env.ENABLE_DEMO_LEARNER !== "true" || !process.env.DEMO_LEARNER_ID) {
    throw new Error("Demo learner is disabled; Plan 2 account authentication is required");
  }
  return process.env.DEMO_LEARNER_ID;
}
