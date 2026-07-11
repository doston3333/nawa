import { getLessonById } from "@/domain/curriculum/path";
import { LessonRunner } from "@/features/learn/lesson-runner";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLessonById(lessonId);
  return <LessonRunner lessonId={lessonId} title={lesson?.title} />;
}
