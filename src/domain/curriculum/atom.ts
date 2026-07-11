import type { Ability, KnowledgeAtom } from "@/domain/learning/types";

const ALL: Ability[] = ["READING", "LISTENING", "WRITING", "SPEAKING"];

export function atom(
  partial: Omit<KnowledgeAtom, "register" | "abilities"> & { abilities?: Ability[] },
): KnowledgeAtom {
  return { register: "MSA", abilities: partial.abilities ?? ALL, ...partial };
}
