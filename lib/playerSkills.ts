import { RANGE_UNIT } from "./constants";
import { canAffordMana, isSkillReady } from "./mana";
import type { GameState, SkillAnimation, SkillCategory, SkillPattern } from "./gameState";

export type PlayerSkill = {
  id: string;
  name: string;
  category: SkillCategory;
  damage: number;
  manaCost: number;
  cooldownMs: number;
  range: number;
  animation: SkillAnimation;
  pattern: SkillPattern;
  maxTravel?: number;
  aoeRadius?: number;
};

export const playerSkills: PlayerSkill[] = [
  {
    id: "spark",
    name: "Spark",
    category: "assault",
    damage: 18,
    manaCost: 12,
    cooldownMs: 2000,
    range: 4,
    animation: "projectile",
    pattern: "directional",
    maxTravel: 200,
  },
  {
    id: "cleave",
    name: "Cleave",
    category: "assault",
    damage: 28,
    manaCost: 18,
    cooldownMs: 4000,
    range: 1,
    animation: "burst",
    pattern: "aoe_self",
    aoeRadius: RANGE_UNIT,
  },
  {
    id: "charge",
    name: "Charge",
    category: "assault",
    damage: 32,
    manaCost: 22,
    cooldownMs: 5000,
    range: 5,
    animation: "projectile",
    pattern: "directional",
    maxTravel: 280,
  },
  {
    id: "frostlance",
    name: "Frostlance",
    category: "arcane",
    damage: 38,
    manaCost: 25,
    cooldownMs: 5000,
    range: 5,
    animation: "beam",
    pattern: "targeted",
  },
  {
    id: "barrier",
    name: "Barrier",
    category: "arcane",
    damage: 0,
    manaCost: 20,
    cooldownMs: 6000,
    range: 0,
    animation: "burst",
    pattern: "defensive",
  },
  {
    id: "nova",
    name: "Nova",
    category: "arcane",
    damage: 42,
    manaCost: 30,
    cooldownMs: 8000,
    range: 2,
    animation: "burst",
    pattern: "aoe_self",
    aoeRadius: RANGE_UNIT * 2,
  },
];

export function findSkillByInput(
  input: string,
  category: SkillCategory,
): PlayerSkill | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  return (
    playerSkills.find(
      (s) => s.category === category && s.name.toLowerCase() === trimmed,
    ) ?? null
  );
}

export function getSkillsForCategory(category: SkillCategory): PlayerSkill[] {
  return playerSkills.filter((s) => s.category === category);
}

export function getSkillById(id: string): PlayerSkill | undefined {
  return playerSkills.find((s) => s.id === id);
}

export function hasCastableSkillInCategory(
  state: GameState,
  category: SkillCategory,
): boolean {
  return getSkillsForCategory(category).some(
    (skill) => isSkillReady(state, skill.id) && canAffordMana(state, skill.manaCost),
  );
}
