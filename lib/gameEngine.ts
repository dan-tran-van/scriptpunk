import { MOVE_SPEED } from "./constants";
import { tickEnemy } from "./enemyAI";
import { clampPosition, normalizeInput } from "./geometry";
import {
  appendLog,
  createCombatState,
  createInitialState,
  type GameAction,
  type GameState,
} from "./gameState";
import { spawnProjectile, tickProjectiles } from "./projectiles";
import { findSkillByInput } from "./skills";

export { createInitialState, createCombatState };
export type { GameAction, GameState };

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

  return { ...state, playerPosition: newPos };
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
      combatLog: appendLog(state.combatLog, "Victory! The boss is defeated."),
    };
  }

  if (state.playerHP <= 0) {
    return {
      ...state,
      phase: "result",
      result: "defeat",
      isSlowMotion: false,
      combatLog: appendLog(state.combatLog, "Defeat... you have fallen."),
    };
  }

  return state;
}

function handleTick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input") return state;

  const cappedDelta = Math.min(deltaMs, 50);
  let next = applyPlayerMovement(state, cappedDelta);
  next = tickEnemy(next, cappedDelta);
  next = tickProjectiles(next, cappedDelta);
  next = decayVisualFlags(next, cappedDelta);
  next = checkPhaseResult(next);
  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_BATTLE":
      return createCombatState(state.arena);

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

    case "BEGIN_CAST":
      if (state.phase !== "combat") return state;
      return {
        ...state,
        phase: "input",
        isSlowMotion: true,
        moveInput: { x: 0, y: 0 },
        combatLog: appendLog(state.combatLog, "Slow motion... type a skill name."),
      };

    case "CANCEL_CAST":
      if (state.phase !== "input") return state;
      return {
        ...state,
        phase: "combat",
        isSlowMotion: false,
        combatLog: appendLog(state.combatLog, "Cast cancelled."),
      };

    case "SUBMIT_SKILL": {
      if (state.phase !== "input") return state;
      const skill = findSkillByInput(action.input);
      if (!skill) {
        return {
          ...state,
          phase: "combat",
          isSlowMotion: false,
          combatLog: appendLog(state.combatLog, `Unknown skill: "${action.input}"`),
        };
      }
      let next = spawnProjectile(
        { ...state, phase: "combat", isSlowMotion: false },
        skill,
      );
      next = checkPhaseResult(next);
      return next;
    }

    case "TICK":
      return handleTick(state, action.deltaMs);

    default:
      return state;
  }
}
