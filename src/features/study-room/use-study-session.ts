"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ability, EvidenceEvent, SessionTask, StudySessionView } from "@/domain/learning/types";
import type { TaskSubmission } from "./task-card";

const abilityForStage: Partial<Record<SessionTask["stage"], Ability>> = {
  RETRIEVAL: "WRITING", NEW_CONCEPT: "WRITING", INPUT: "READING", OUTPUT: "WRITING",
};

function normalizeArabic(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

function buildEvidence(task: SessionTask, submission: TaskSubmission, learnerId: string): EvidenceEvent | null {
  const atomId = task.atomIds[0];
  const ability = abilityForStage[task.stage];
  if (!atomId || !ability || task.expectedAnswer === null) return null;
  return {
    id: crypto.randomUUID(), learnerId, atomId, ability,
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
        setView(body as StudySessionView);
        setError(null);
      } catch (reason: unknown) {
        if (!active || controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Unable to load your study session");
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
    try {
      const nextTaskIndex = view.currentTaskIndex + 1;
      const response = await fetch(`/api/study/sessions/${view.plan.id}/attempts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskId: currentTask.id,
          nextTaskIndex,
          event: buildEvidence(currentTask, submission, view.plan.learnerId),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save this attempt");
      setCounts(body.counts);
      setView({
        ...view,
        currentTaskIndex: nextTaskIndex,
        status: nextTaskIndex >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE",
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this attempt");
    } finally {
      setSubmitting(false);
    }
  }, [currentTask, view]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setView(null);
    setRequestKey((value) => value + 1);
  }, []);

  return { view, currentTask, loading, error, submitAttempt, submitting, counts, retry };
}
