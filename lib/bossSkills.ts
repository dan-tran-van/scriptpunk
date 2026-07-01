import { BOSS_MELEE_RANGE } from "./constants";
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
    damage: 15,
    windupMs: 1200,
    animation: "burst",
    pattern: "aoe_self",
    aoeRadius: BOSS_MELEE_RANGE,
  },
  {
    id: "void_bolt",
    name: "Void Bolt",
    damage: 20,
    windupMs: 1000,
    animation: "projectile",
    pattern: "directional",
    maxTravel: 350,
  },
  {
    id: "pulse",
    name: "Pulse",
    damage: 18,
    windupMs: 1400,
    animation: "burst",
    pattern: "aoe_target",
    aoeRadius: BOSS_MELEE_RANGE,
  },
];

export function getBossSkillById(id: string): BossSkill | undefined {
  return bossSkills.find((s) => s.id === id);
}

export function pickRandomBossSkill(): BossSkill {
  return bossSkills[Math.floor(Math.random() * bossSkills.length)];
}
