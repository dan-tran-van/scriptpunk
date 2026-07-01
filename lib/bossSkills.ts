import type { SkillAnimation, SkillPattern } from "./gameState";

export type BossSkill = {
  id: string;
  name: string;
  damage: number;
  windupMs: number;
  animation: SkillAnimation;
  pattern: SkillPattern;
  aoeRadius?: number;
  maxTravel?: number;
};

export const bossSkills: BossSkill[] = [
  {
    id: "slam",
    name: "Slam",
    damage: 20,
    windupMs: 800,
    animation: "burst",
    pattern: "aoe_self",
  },
  {
    id: "void_bolt",
    name: "Void Bolt",
    damage: 26,
    windupMs: 650,
    animation: "projectile",
    pattern: "directional",
    maxTravel: 400,
  },
  {
    id: "pulse",
    name: "Pulse",
    damage: 24,
    windupMs: 900,
    animation: "burst",
    pattern: "aoe_target",
  },
  {
    id: "ruin_beam",
    name: "Ruin Beam",
    damage: 28,
    windupMs: 950,
    animation: "beam",
    pattern: "targeted",
  },
  {
    id: "rift_shard",
    name: "Rift Shard",
    damage: 18,
    windupMs: 600,
    animation: "projectile",
    pattern: "targeted",
  },
];

export function getBossSkillById(id: string): BossSkill | undefined {
  return bossSkills.find((s) => s.id === id);
}

export function pickRandomBossSkill(): BossSkill {
  return bossSkills[Math.floor(Math.random() * bossSkills.length)];
}

export function pickRandomBossSkillFromPool(skillIds: string[]): BossSkill {
  const pool = bossSkills.filter((s) => skillIds.includes(s.id));
  if (pool.length === 0) return bossSkills[0];
  return pool[Math.floor(Math.random() * pool.length)];
}
