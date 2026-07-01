import {
  MANA_REGEN_PER_MS,
  MANA_RESTORE_ON_BOSS_HIT,
  PLAYER_MAX_MANA,
} from "./constants";
import type { GameState } from "./gameState";

export function tickManaRegen(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input") return state;
  if (state.playerMana >= state.playerMaxMana) return state;

  return {
    ...state,
    playerMana: Math.min(
      state.playerMaxMana,
      state.playerMana + MANA_REGEN_PER_MS * deltaMs,
    ),
  };
}

export function tickSkillCooldowns(state: GameState, deltaMs: number): GameState {
  const ids = Object.keys(state.skillCooldowns);
  if (ids.length === 0) return state;

  const skillCooldowns = { ...state.skillCooldowns };
  for (const id of ids) {
    const remaining = skillCooldowns[id] - deltaMs;
    if (remaining <= 0) {
      delete skillCooldowns[id];
    } else {
      skillCooldowns[id] = remaining;
    }
  }

  return { ...state, skillCooldowns };
}

export function canAffordMana(state: GameState, cost: number): boolean {
  return state.playerMana >= cost;
}

export function isSkillReady(state: GameState, skillId: string): boolean {
  return (state.skillCooldowns[skillId] ?? 0) <= 0;
}

export function spendMana(state: GameState, cost: number): GameState {
  return {
    ...state,
    playerMana: Math.max(0, state.playerMana - cost),
  };
}

export function startCooldown(state: GameState, skillId: string, ms: number): GameState {
  return {
    ...state,
    skillCooldowns: { ...state.skillCooldowns, [skillId]: ms },
  };
}

export function restoreManaOnBossHit(state: GameState): GameState {
  return {
    ...state,
    playerMana: Math.min(
      state.playerMaxMana,
      state.playerMana + MANA_RESTORE_ON_BOSS_HIT,
    ),
  };
}

export function createManaState(): { playerMana: number; playerMaxMana: number } {
  return { playerMana: PLAYER_MAX_MANA, playerMaxMana: PLAYER_MAX_MANA };
}
