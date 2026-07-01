import {
  ARCANE_LANE_COOLDOWN_MS,
  ARCANE_MANA_COST,
  ASSAULT_LANE_COOLDOWN_MS,
  ASSAULT_MANA_COST,
  RANGE_UNIT,
} from "./constants";
import { canAffordMana, isLaneSkillReady } from "./mana";
import type { GameState, SkillAnimation, SkillCategory, SkillPattern } from "./gameState";

export type PlayerSkill = {
  id: string;
  name: string;
  category: SkillCategory;
  damage: number;
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
    range: 5,
    animation: "beam",
    pattern: "targeted",
  },
  {
    id: "barrier",
    name: "Barrier",
    category: "arcane",
    damage: 0,
    range: 0,
    animation: "burst",
    pattern: "defensive",
  },
  {
    id: "nova",
    name: "Nova",
    category: "arcane",
    damage: 42,
    range: 2,
    animation: "burst",
    pattern: "aoe_self",
    aoeRadius: RANGE_UNIT * 2,
  },
];

export function getCategoryManaCost(category: SkillCategory): number {
  return category === "assault" ? ASSAULT_MANA_COST : ARCANE_MANA_COST;
}

export function getCategoryLaneCooldownMs(category: SkillCategory): number {
  return category === "assault" ? ASSAULT_LANE_COOLDOWN_MS : ARCANE_LANE_COOLDOWN_MS;
}

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
  return (
    isLaneSkillReady(state, category) &&
    canAffordMana(state, getCategoryManaCost(category))
  );
}
