import {
  CAST_FIZZLE_CATEGORY_CD_MS,
  CAST_INPUT_TIMEOUT_MS,
} from "./constants";
import { appendLog, type GameState, type SkillCategory } from "./gameState";
import { hasCastableSkillInCategory } from "./playerSkills";

export function getCategoryCooldown(state: GameState, category: SkillCategory): number {
  return state.categoryCooldowns[category] ?? 0;
}

export function isCategoryReady(state: GameState, category: SkillCategory): boolean {
  if (getCategoryCooldown(state, category) > 0) return false;
  return hasCastableSkillInCategory(state, category);
}

export function startCategoryCooldown(
  state: GameState,
  category: SkillCategory,
  ms: number,
): GameState {
  return {
    ...state,
    categoryCooldowns: {
      ...state.categoryCooldowns,
      [category]: ms,
    },
  };
}

export function tickCategoryCooldowns(state: GameState, deltaMs: number): GameState {
  let changed = false;
  const categoryCooldowns = { ...state.categoryCooldowns };

  for (const category of ["assault", "arcane"] as SkillCategory[]) {
    const remaining = categoryCooldowns[category];
    if (remaining <= 0) continue;
    const next = remaining - deltaMs;
    if (next <= 0) {
      categoryCooldowns[category] = 0;
    } else {
      categoryCooldowns[category] = next;
    }
    changed = true;
  }

  return changed ? { ...state, categoryCooldowns } : state;
}

function fizzleCast(state: GameState, category: SkillCategory): GameState {
  return startCategoryCooldown(
    {
      ...state,
      phase: "combat",
      isSlowMotion: false,
      activeCastCategory: null,
      castInputRemainingMs: 0,
      combatLog: appendLog(state.combatLog, "Cast fizzled — too slow!"),
    },
    category,
    CAST_FIZZLE_CATEGORY_CD_MS,
  );
}

export function tickCastInputTimer(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "input" || !state.activeCastCategory) return state;

  const remaining = state.castInputRemainingMs - deltaMs;
  if (remaining <= 0) {
    return fizzleCast(state, state.activeCastCategory);
  }

  return { ...state, castInputRemainingMs: remaining };
}

export function beginCastChannel(state: GameState, category: SkillCategory): GameState {
  return {
    ...state,
    phase: "input",
    isSlowMotion: true,
    activeCastCategory: category,
    castInputRemainingMs: CAST_INPUT_TIMEOUT_MS,
    moveInput: { x: 0, y: 0 },
  };
}

export function cancelCastChannel(state: GameState): GameState {
  return {
    ...state,
    phase: "combat",
    isSlowMotion: false,
    activeCastCategory: null,
    castInputRemainingMs: 0,
  };
}

export function categoryLabel(category: SkillCategory): string {
  return category === "assault" ? "Assault" : "Arcane";
}
