"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ability, EvidenceEvent, SessionTask, StudySessionView } from "@/domain/learning/types";
import type { TaskSubmission } from "@/features/study-room/task-card";
import type { InteractiveStepSubmission } from "./interactive-lesson-step";
import { ACTIVE_COURSE } from "@/domain/course/catalog";
import { buildAttemptMutation, httpError, isNetworkFailure, notifyOfflineChange, readActiveProfileId } from "@/features/offline/attempt-mutation";
import { enqueueMutation } from "@/lib/offline/outbox";
import { getDeviceId } from "@/lib/offline/sync-client";
import { cacheSession, listCachedSessions, selectLatestActiveSession } from "@/lib/offline/profile-cache";


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

function buildInteractiveEvidence(task: SessionTask, submission: InteractiveStepSubmission, profileId: string, lessonId: string): EvidenceEvent | null {
  const event = buildEvidence(task, {
    answer: submission.answer,
    helpLevel: 0,
    attempted: true,
    startedAt: submission.startedAt,
    confidence: 3,
  }, profileId);
  const lesson = ACTIVE_COURSE.units.flatMap((unit) => unit.lessons).find((item) => item.id === lessonId);
  if (!event || !lesson) return event;
  return {
    ...event,
    correct: submission.correct,
    responseMode: submission.responseMode,
    curriculumVersion: ACTIVE_COURSE.version,
    skillId: lesson.skillIds[0] ?? null,
    exerciseType: submission.exerciseType,
    responseTimeMs: event.latencyMs,
    hintUsed: submission.hintUsed,
    errorClassification: submission.errorClassification,
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
  const [internetRequired, setInternetRequired] = useState(false);
  const [scoredChecks, setScoredChecks] = useState({ correct: 0, total: 0 });

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
          const nextView = body as StudySessionView;
          await cacheSession(nextView.plan.profileId, { id: nextView.plan.id, ...nextView }).catch(() => undefined);
          setView(nextView);
          setError(null);
          setInternetRequired(false);
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          const profileId = readActiveProfileId();
          if (isNetworkFailure(reason) && profileId) {
            void listCachedSessions(profileId).then((rows) => {
              const cached = selectLatestActiveSession(rows, (row) => {
                const plan = row.plan as StudySessionView["plan"] | undefined;
                return plan?.mode === "LESSON" && plan.lessonId === lessonId;
              });
              if (cached && !controller.signal.aborted) {
                setView(cached as unknown as StudySessionView);
                setError(null);
                setInternetRequired(false);
              } else if (!controller.signal.aborted) {
                setError("Internet required to start this lesson");
                setInternetRequired(true);
              }
              if (!controller.signal.aborted) setLoading(false);
            }).catch(() => {
              if (!controller.signal.aborted) {
                setError("Internet required to start this lesson");
                setInternetRequired(true);
                setLoading(false);
              }
            });
            return;
          }
          const networkRequired = isNetworkFailure(reason);
          setError(networkRequired ? "Internet required to start this lesson" : reason instanceof Error ? reason.message : "Unable to start lesson");
          setInternetRequired(networkRequired);
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
    async (submission?: TaskSubmission | InteractiveStepSubmission) => {
      if (!view || !currentTask) return;
      setSubmitting(true);
      setError(null);
      const nextTaskIndex = view.currentTaskIndex + 1;
      const interactiveSubmission = submission && "exerciseType" in submission ? submission : null;
      const event = !submission
        ? null
        : interactiveSubmission
          ? buildInteractiveEvidence(currentTask, interactiveSubmission, view.plan.profileId, lessonId)
          : buildEvidence(currentTask, submission as TaskSubmission, view.plan.profileId);
      const recordScoredCheck = () => {
        if (interactiveSubmission?.exerciseType === "SCORED_TEST") {
          setScoredChecks((current) => ({ correct: current.correct + Number(interactiveSubmission.correct), total: current.total + 1 }));
        }
      };
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
        if (body.lesson?.nextLessonId) setNextLessonId(body.lesson.nextLessonId);
        setInternetRequired(false);
        const nextView: StudySessionView = {
          ...view,
          plan: (body.plan as StudySessionView["plan"] | undefined) ?? view.plan,
          currentTaskIndex: nextTaskIndex,
          status: body.status ?? (nextTaskIndex >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE"),
        };
        setView(nextView);
        recordScoredCheck();
        void cacheSession(view.plan.profileId, { id: view.plan.id, ...nextView }).catch(() => undefined);
      } catch (reason) {
        if (isNetworkFailure(reason)) {
          try {
            const mutation = buildAttemptMutation({
              profileId: view.plan.profileId,
              deviceId: await getDeviceId(view.plan.profileId),
              sessionId: view.plan.id,
              taskId: currentTask.id,
              nextTaskIndex: view.currentTaskIndex + 1,
              event,
            });
            await enqueueMutation(mutation);
            const nextView: StudySessionView = {
              ...view,
              currentTaskIndex: view.currentTaskIndex + 1,
              status: view.currentTaskIndex + 1 >= view.plan.tasks.length ? "COMPLETE" : "ACTIVE",
            };
            setView(nextView);
            recordScoredCheck();
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
    },
    [currentTask, lessonId, view],
  );

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setInternetRequired(false);
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
    scoredChecks,
    nextLessonId,
    submitAttempt,
    retry,
    internetRequired,
  };
}
