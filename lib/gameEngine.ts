import { MOVE_SPEED, CAST_CATEGORY_COOLDOWN_MS } from "./constants";
import {
  beginCastChannel,
  cancelCastChannel,
  categoryLabel,
  isCategoryReady,
  startCategoryCooldown,
  tickCastInputTimer,
  tickCategoryCooldowns,
} from "./castChannel";
import { tickEnemy } from "./enemyAI";
import { clampPosition, normalizeInput } from "./geometry";
import {
  canAffordMana,
  isLaneSkillReady,
  spendMana,
  startLaneSkillCooldown,
  tickManaRegen,
  tickSkillCooldowns,
} from "./mana";
import {
  appendLog,
  createCombatState,
  createInitialState,
  type GameAction,
  type GameState,
} from "./gameState";
import { spawnPlayerSkill, tickProjectiles } from "./projectiles";
import { findSkillByInput, getCategoryLaneCooldownMs, getCategoryManaCost } from "./playerSkills";
import { getWorldDeltaMs } from "./timeScale";
import { MAX_LEVEL } from "./levels";

export { createInitialState, createCombatState };
export type { GameAction, GameState, SkillCategory } from "./gameState";
export { isCategoryReady, getCategoryCooldown } from "./castChannel";
export { getLaneSkillCooldown } from "./mana";
export { getLevelConfig, MAX_LEVEL } from "./levels";

function applyPlayerMovement(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat") return state;
  const { x, y } = state.moveInput;
  if (x === 0 && y === 0) return state;

  const dir = normalizeInput(x, y);
  const newPos = clampPosition(
    {
      x: state.playerPosition.x + dir.x * MOVE_SPEED * deltaMs,
      y: state.playerPosition.y + dir.y * MOVE_SPEED * deltaMs,
    },
    state.arena,
  );

  return {
    ...state,
    playerPosition: newPos,
    playerDirection: dir,
  };
}

function decayVisualFlags(state: GameState, deltaMs: number): GameState {
  let {
    playerHitFlashMs,
    enemyHitFlashMs,
    playerCastingGlowMs,
    playerHitFlash,
    enemyHitFlash,
    playerCastingGlow,
  } = state;

  if (playerHitFlashMs > 0) {
    playerHitFlashMs = Math.max(0, playerHitFlashMs - deltaMs);
    playerHitFlash = playerHitFlashMs > 0;
  }
  if (enemyHitFlashMs > 0) {
    enemyHitFlashMs = Math.max(0, enemyHitFlashMs - deltaMs);
    enemyHitFlash = enemyHitFlashMs > 0;
  }
  if (playerCastingGlowMs > 0) {
    playerCastingGlowMs = Math.max(0, playerCastingGlowMs - deltaMs);
    playerCastingGlow = playerCastingGlowMs > 0;
  }

  return {
    ...state,
    playerHitFlashMs,
    enemyHitFlashMs,
    playerCastingGlowMs,
    playerHitFlash,
    enemyHitFlash,
    playerCastingGlow,
  };
}

function checkPhaseResult(state: GameState): GameState {
  if (state.phase !== "combat" && state.phase !== "input") return state;

  if (state.enemyHP <= 0) {
    return {
      ...state,
      phase: "result",
      result: "victory",
      isSlowMotion: false,
      activeCastCategory: null,
      castInputRemainingMs: 0,
      combatLog: appendLog(
        state.combatLog,
        state.level < MAX_LEVEL
          ? `Level ${state.level} complete!`
          : "Victory! Campaign complete!",
      ),
    };
  }

  if (state.playerHP <= 0) {
    return {
      ...state,
      phase: "result",
      result: "defeat",
      isSlowMotion: false,
      activeCastCategory: null,
      castInputRemainingMs: 0,
      combatLog: appendLog(state.combatLog, "Defeat... you have fallen."),
    };
  }

  return state;
}

function handleTick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input") return state;

  const cappedDelta = Math.min(deltaMs, 50);
  const worldDelta = getWorldDeltaMs(state, cappedDelta);
  let next = tickCategoryCooldowns(state, cappedDelta);
  next = tickCastInputTimer(next, cappedDelta);
  if (next.phase !== "input") {
    next = applyPlayerMovement(next, cappedDelta);
  }
  next = tickManaRegen(next, cappedDelta);
  next = tickSkillCooldowns(next, cappedDelta);
  next = tickEnemy(next, worldDelta);
  next = tickProjectiles(next, worldDelta);
  next = decayVisualFlags(next, worldDelta);
  next = checkPhaseResult(next);
  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_BATTLE":
      return createCombatState(state.arena, action.level ?? state.level);

    case "NEXT_LEVEL":
      if (state.phase !== "result" || state.result !== "victory") return state;
      if (state.level >= MAX_LEVEL) return state;
      return createCombatState(state.arena, state.level + 1);

    case "RETRY_LEVEL":
      if (state.phase !== "result" || state.result !== "defeat") return state;
      return createCombatState(state.arena, state.level);

    case "RESTART":
      return { ...createInitialState(state.arena), phase: "idle" };

    case "RESIZE_ARENA": {
      const arena = { width: action.width, height: action.height };
      if (state.phase === "idle") {
        return createInitialState(arena);
      }
      if (state.phase === "result") {
        return { ...state, arena };
      }
      return {
        ...state,
        arena,
        playerPosition: clampPosition(state.playerPosition, arena),
        enemyPosition: clampPosition(state.enemyPosition, arena),
      };
    }

    case "PLAYER_MOVE":
      return { ...state, moveInput: { x: action.dx, y: action.dy } };

    case "BEGIN_CAST": {
      if (state.phase !== "combat") return state;

      if (!isCategoryReady(state, action.category)) {
        const onCd = (state.categoryCooldowns[action.category] ?? 0) > 0;
        const message = onCd
          ? `${categoryLabel(action.category)} not ready yet.`
          : `No ${categoryLabel(action.category).toLowerCase()} skills available.`;
        return { ...state, combatLog: appendLog(state.combatLog, message) };
      }

      return beginCastChannel(
        {
          ...state,
          combatLog: appendLog(
            state.combatLog,
            `Slow motion... type a ${categoryLabel(action.category).toLowerCase()} skill.`,
          ),
        },
        action.category,
      );
    }

    case "CANCEL_CAST":
      if (state.phase !== "input") return state;
      return {
        ...cancelCastChannel(state),
        combatLog: appendLog(state.combatLog, "Cast cancelled."),
      };

    case "SUBMIT_SKILL": {
      if (state.phase !== "input" || !state.activeCastCategory) return state;

      const category = state.activeCastCategory;
      const skill = findSkillByInput(action.input, category);
      if (!skill) {
        return {
          ...cancelCastChannel(state),
          combatLog: appendLog(state.combatLog, `Unknown skill: "${action.input}"`),
        };
      }

      const manaCost = getCategoryManaCost(category);

      if (!canAffordMana(state, manaCost)) {
        return {
          ...cancelCastChannel(state),
          combatLog: appendLog(
            state.combatLog,
            `Not enough mana for ${categoryLabel(category)} (need ${manaCost}).`,
          ),
        };
      }

      if (!isLaneSkillReady(state, category)) {
        return {
          ...cancelCastChannel(state),
          combatLog: appendLog(
            state.combatLog,
            `${categoryLabel(category)} skills are on cooldown.`,
          ),
        };
      }

      let next = spawnPlayerSkill(cancelCastChannel(state), skill);
      next = spendMana(next, manaCost);
      next = startLaneSkillCooldown(next, category, getCategoryLaneCooldownMs(category));
      next = startCategoryCooldown(next, category, CAST_CATEGORY_COOLDOWN_MS);
      next = checkPhaseResult(next);
      return next;
    }

    case "TICK":
      return handleTick(state, action.deltaMs);

    default:
      return state;
  }
}
