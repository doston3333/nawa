"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ability, EvidenceEvent, SessionTask, StudySessionView } from "@/domain/learning/types";
import type { TaskSubmission } from "@/features/study-room/task-card";

function normalizeArabic(value: string): string {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/\s+/g, " ").trim();
}

function buildEvidence(
  task: SessionTask,
  submission: TaskSubmission,
  profileId: string,
): EvidenceEvent | null {
  const atomId = task.atomIds[0];
  if (!atomId || task.expectedAnswer === null) return null;
  const correct =
    normalizeArabic(submission.answer) === normalizeArabic(task.expectedAnswer) ||
    submission.answer.trim().toLowerCase() === task.expectedAnswer.trim().toLowerCase();
  return {
    id: crypto.randomUUID(),
    profileId,
    atomId,
    ability: task.kind === "SELECT" && task.promptArabic ? "READING" : "WRITING",
    occurredAt: new Date().toISOString(),
    correct,
    responseMode: task.responseMode ?? (task.choices?.length ? "SELECT" : "TYPE"),
    helpLevel: submission.helpLevel,
    latencyMs: Date.now() - Date.parse(submission.startedAt),
    confidence: submission.confidence,
    novelContext: false,
    analysisConfidence: null,
  };
}

export function useLessonSession(lessonId: string) {
  const [view, setView] = useState<StudySessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState<Record<Ability, number>>({
    READING: 0,
    LISTENING: 0,
    WRITING: 0,
    SPEAKING: 0,
  });
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/learn/lessons/${encodeURIComponent(lessonId)}/start`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to start lesson");
        if (!controller.signal.aborted) {
          setView(body as StudySessionView);
          setError(null);
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Unable to start lesson");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [lessonId, requestKey]);

  const currentTask = useMemo(() => {
    if (!view) return null;
    if (view.currentTaskIndex >= view.plan.tasks.length) return null;
    return view.plan.tasks[view.currentTaskIndex] ?? null;
  }, [view]);

  const submitAttempt = useCallback(
    async (submission: TaskSubmission) => {
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
            event: buildEvidence(currentTask, submission, view.plan.profileId),
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to save this attempt");
        if (body.counts) setCounts(body.counts);
        if (body.lesson?.nextLessonId) setNextLessonId(body.lesson.nextLessonId);
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
    },
    [currentTask, view],
  );

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setView(null);
    setRequestKey((value) => value + 1);
  }, []);

  return {
    view,
    currentTask,
    loading,
    error,
    submitting,
    counts,
    nextLessonId,
    submitAttempt,
    retry,
  };
}
