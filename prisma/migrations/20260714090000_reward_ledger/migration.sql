CREATE TABLE "RewardLedger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "originKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "ink" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyActivity" (
    "profileId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("profileId", "day")
);

CREATE UNIQUE INDEX "RewardLedger_profileId_originKey_key" ON "RewardLedger"("profileId", "originKey");
CREATE INDEX "RewardLedger_profileId_createdAt_idx" ON "RewardLedger"("profileId", "createdAt");

ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
