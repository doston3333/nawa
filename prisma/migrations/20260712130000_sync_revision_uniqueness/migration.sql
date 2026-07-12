-- Prevent duplicate per-entity revisions if a caller bypasses the service-level lock.
CREATE UNIQUE INDEX "SyncChange_profileId_entityType_entityId_revision_key"
  ON "SyncChange"("profileId", "entityType", "entityId", "revision");
