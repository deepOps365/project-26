import { notFound } from "next/navigation";
import { SkillDetail } from "@/components/skills/SkillDetail";
import { SKILL_IDS, type SkillId } from "@/lib/types";

export const dynamicParams = false;
export function generateStaticParams() {
  return SKILL_IDS.map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SKILL_IDS.includes(id as SkillId)) notFound();
  return <SkillDetail id={id as SkillId} />;
}
