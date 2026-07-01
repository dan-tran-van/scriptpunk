export type SkillAnimation = "projectile" | "burst" | "beam";

export type Skill = {
  name: string;
  damage: number;
  range: number;
  animation: SkillAnimation;
};

export const skills: Skill[] = [
  { name: "Slash", damage: 20, range: 1, animation: "burst" },
  { name: "Fireball", damage: 35, range: 5, animation: "projectile" },
  { name: "Shield", damage: 0, range: 0, animation: "burst" },
];

export function findSkillByInput(input: string): Skill | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  return skills.find((s) => s.name.toLowerCase() === trimmed) ?? null;
}
