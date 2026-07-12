"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ability, EvidenceEvent, SessionTask, StudySessionView } from "@/domain/learning/types";
import type { TaskSubmission } from "./task-card";
import { buildAttemptMutation, httpError, isNetworkFailure, notifyOfflineChange, readActiveProfileId } from "@/features/offline/attempt-mutation";
import { enqueueMutation } from "@/lib/offline/outbox";
import { getDeviceId } from "@/lib/offline/sync-client";
import { cacheSession, listCachedSessions, selectLatestActiveSession } from "@/lib/offline/profile-cache";

const abilityForStage: Partial<Record<SessionTask["stage"], Ability>> = {
  RETRIEVAL: "WRITING", NEW_CONCEPT: "WRITING", INPUT: "READING", OUTPUT: "WRITING",
};

function normalizeArabic(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

function buildEvidence(task: SessionTask, submission: TaskSubmission, profileId: string): EvidenceEvent | null {
  const atomId = task.atomIds[0];
  const ability = abilityForStage[task.stage];
  if (!atomId || !ability || task.expectedAnswer === null) return null;
  return {
    id: crypto.randomUUID(), profileId, atomId, ability,
    occurredAt: new Date().toISOString(),
    correct: normalizeArabic(submission.answer) === normalizeArabic(task.expectedAnswer),
    responseMode: "TYPE", helpLevel: submission.helpLevel,
    latencyMs: Date.now() - Date.parse(submission.startedAt), confidence: submission.confidence,
    novelContext: task.stage === "OUTPUT", analysisConfidence: null,
  };
}

export function useStudySession(durationMinutes: 30 | 45 | 60) {
  const [view, setView] = useState<StudySessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestKey, setRequestKey] = useState(0);
  const [counts, setCounts] = useState<Record<Ability, number>>({ READING: 0, LISTENING: 0, WRITING: 0, SPEAKING: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [internetRequired, setInternetRequired] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/study/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ durationMinutes }),
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load your study session");
        if (!active) return;
        const nextView = body as StudySessionView;
        await cacheSession(nextView.plan.profileId, { id: nextView.plan.id, ...nextView }).catch(() => undefined);
        setView(nextView);
        setError(null);
        setInternetRequired(false);
      } catch (reason: unknown) {
        if (!active || controller.signal.aborted) return;
        const profileId = readActiveProfileId();
        if (isNetworkFailure(reason) && profileId) {
          void listCachedSessions(profileId).then((rows) => {
            const cached = selectLatestActiveSession(rows, (row) => {
              const plan = row.plan as StudySessionView["plan"] | undefined;
              return plan?.durationMinutes === durationMinutes && plan.mode !== "LESSON";
            });
            if (!active || controller.signal.aborted) return;
            if (cached) {
              setView(cached as unknown as StudySessionView);
              setError(null);
              setInternetRequired(false);
            } else {
              setError("Internet required to start a study session");
              setInternetRequired(true);
            }
            setLoading(false);
          }).catch(() => {
            if (active && !controller.signal.aborted) {
              setError("Internet required to start a study session");
              setInternetRequired(true);
              setLoading(false);
            }
          });
          return;
        }
        setError(isNetworkFailure(reason) ? "Internet required to start a study session" : reason instanceof Error ? reason.message : "Unable to load your study session");
        setInternetRequired(isNetworkFailure(reason));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [durationMinutes, requestKey]);

  const currentTask = useMemo(() => {
    if (!view) return null;
    if (view.currentTaskIndex >= view.plan.tasks.length) return null;
    return view.plan.tasks[view.currentTaskIndex] ?? null;
  }, [view]);

  const submitAttempt = useCallback(async (submission: TaskSubmission) => {
    if (!view || !currentTask) return;
    setSubmitting(true);
    setError(null);
    const nextTaskIndex = view.currentTaskIndex + 1;
    const event = buildEvidence(currentTask, submission, view.plan.profileId);
    try {
      const response = await fetch(`/api/study/sessions/${view.plan.id}/attempts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: currentTask.id,
          nextTaskIndex,
          event,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw httpError(body.error ?? "Unable to save this attempt", response.status);
      if (body.counts) setCounts(body.counts);
      const nextView: StudySessionView = {
        ...view,
        plan: (body.plan as StudySessionView["plan"] | undefined) ?? view.plan,
        currentTaskIndex: nextTaskIndex,
        status: body.status ?? (nextTaskIndex >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE"),
      };
      setView(nextView);
      setInternetRequired(false);
      void cacheSession(view.plan.profileId, { id: view.plan.id, ...nextView }).catch(() => undefined);
    } catch (reason) {
      if (isNetworkFailure(reason)) {
        try {
          const mutation = buildAttemptMutation({
            profileId: view.plan.profileId,
            deviceId: await getDeviceId(view.plan.profileId),
            sessionId: view.plan.id,
            taskId: currentTask.id,
            nextTaskIndex,
            event,
          });
          await enqueueMutation(mutation);
          const nextView: StudySessionView = {
            ...view,
            currentTaskIndex: nextTaskIndex,
            status: nextTaskIndex >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE",
          };
          setView(nextView);
          await cacheSession(view.plan.profileId, { id: view.plan.id, ...nextView });
          notifyOfflineChange();
          setError(null);
          setInternetRequired(false);
        } catch (offlineError) {
          setError(offlineError instanceof Error ? offlineError.message : "Unable to save this attempt locally");
        }
      } else {
        setError(reason instanceof Error ? reason.message : "Unable to save this attempt");
      }
    } finally {
      setSubmitting(false);
    }
  }, [currentTask, view]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setInternetRequired(false);
    setView(null);
    setRequestKey((value) => value + 1);
  }, []);

  return { view, currentTask, loading, error, submitAttempt, submitting, counts, retry, internetRequired };
}
