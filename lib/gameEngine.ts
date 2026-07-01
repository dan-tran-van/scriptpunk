import { MOVE_SPEED, CAST_CATEGORY_COOLDOWN_MS, RANGE_UNIT } from "./constants";
import { updateCamera } from "./camera";
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
import { normalizeInput } from "./geometry";
import { getMapData } from "./maps";
import { getMapWorldSize, resolveMovement } from "./map";
import { PLAYER_HITBOX } from "./constants";
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
import { spawnPlayerGroundSkill, spawnPlayerSkill, tickProjectiles } from "./projectiles";
import {
  findSkillByInput,
  getCategoryLaneCooldownMs,
  getCategoryManaCost,
  getSkillById,
} from "./playerSkills";
import { getWorldDeltaMs } from "./timeScale";
import { MAX_LEVEL } from "./levels";
import { tickMinions } from "./minionAI";
import { clampReticleToRange, isGroundTargetPattern } from "./targeting";

export { createInitialState, createCombatState };
export type { GameAction, GameState, SkillCategory } from "./gameState";
export { isCategoryReady, getCategoryCooldown } from "./castChannel";
export { getLaneSkillCooldown } from "./mana";
export { getLevelConfig, MAX_LEVEL } from "./levels";

const RETICLE_SPEED = 0.2;

function applyPlayerMovement(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat") return state;
  const { x, y } = state.moveInput;
  if (x === 0 && y === 0) return state;

  const map = getMapData(state.mapId);
  const world = getMapWorldSize(map);
  const dir = normalizeInput(x, y);
  const proposed = {
    x: state.playerPosition.x + dir.x * MOVE_SPEED * deltaMs,
    y: state.playerPosition.y + dir.y * MOVE_SPEED * deltaMs,
  };
  const newPos = resolveMovement(
    map,
    state.playerPosition,
    proposed,
    PLAYER_HITBOX,
    world,
  );

  return {
    ...state,
    playerPosition: newPos,
    playerDirection: dir,
  };
}

function applyReticleMovement(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "targeting" || !state.targetingReticle || !state.pendingGroundSkillId) {
    return state;
  }

  const skill = getSkillById(state.pendingGroundSkillId);
  if (!skill) return state;

  const { x, y } = state.moveInput;
  if (x === 0 && y === 0) return state;

  const dir = normalizeInput(x, y);
  const rangePx = skill.range * RANGE_UNIT;
  const moved = {
    x: state.targetingReticle.x + dir.x * RETICLE_SPEED * deltaMs,
    y: state.targetingReticle.y + dir.y * RETICLE_SPEED * deltaMs,
  };
  const clamped = clampReticleToRange(state.playerPosition, moved, rangePx);

  return { ...state, targetingReticle: clamped };
}

function updateCameraFollow(state: GameState): GameState {
  if (state.phase === "idle" || state.phase === "result") return state;
  return {
    ...state,
    camera: updateCamera(state.playerPosition, state.arena, state.worldSize),
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
  if (
    state.phase !== "combat" &&
    state.phase !== "input" &&
    state.phase !== "targeting"
  ) {
    return state;
  }

  if (state.enemyHP <= 0) {
    return {
      ...state,
      phase: "result",
      result: "victory",
      isSlowMotion: false,
      activeCastCategory: null,
      castInputRemainingMs: 0,
      targetingReticle: null,
      pendingGroundSkillId: null,
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
      targetingReticle: null,
      pendingGroundSkillId: null,
      combatLog: appendLog(state.combatLog, "Defeat... you have fallen."),
    };
  }

  return state;
}

function beginGroundTargeting(state: GameState, skillId: string): GameState {
  const skill = getSkillById(skillId);
  if (!skill) return state;

  const rangePx = skill.range * RANGE_UNIT;
  const dir = state.playerDirection;
  const initial = clampReticleToRange(
    state.playerPosition,
    {
      x: state.playerPosition.x + dir.x * rangePx * 0.5,
      y: state.playerPosition.y + dir.y * rangePx * 0.5,
    },
    rangePx,
  );

  return {
    ...cancelCastChannel(state),
    phase: "targeting",
    pendingGroundSkillId: skill.id,
    targetingReticle: initial,
    moveInput: { x: 0, y: 0 },
    combatLog: appendLog(
      state.combatLog,
      `Aim ${skill.name} — [WASD] move, [Enter] confirm, [Esc] cancel`,
    ),
  };
}

function confirmGroundTarget(state: GameState): GameState {
  if (
    state.phase !== "targeting" ||
    !state.pendingGroundSkillId ||
    !state.targetingReticle
  ) {
    return state;
  }

  const skill = getSkillById(state.pendingGroundSkillId);
  if (!skill) return state;

  const category = skill.category;
  const manaCost = getCategoryManaCost(category);

  if (!canAffordMana(state, manaCost)) {
    return {
      ...state,
      phase: "combat",
      pendingGroundSkillId: null,
      targetingReticle: null,
      combatLog: appendLog(
        state.combatLog,
        `Not enough mana for ${categoryLabel(category)} (need ${manaCost}).`,
      ),
    };
  }

  if (!isLaneSkillReady(state, category)) {
    return {
      ...state,
      phase: "combat",
      pendingGroundSkillId: null,
      targetingReticle: null,
      combatLog: appendLog(
        state.combatLog,
        `${categoryLabel(category)} skills are on cooldown.`,
      ),
    };
  }

  let next = spawnPlayerGroundSkill(state, skill, state.targetingReticle);
  next = spendMana(next, manaCost);
  next = startLaneSkillCooldown(next, category, getCategoryLaneCooldownMs(category));
  next = startCategoryCooldown(next, category, CAST_CATEGORY_COOLDOWN_MS);
  next = {
    ...next,
    phase: "combat",
    pendingGroundSkillId: null,
    targetingReticle: null,
    moveInput: { x: 0, y: 0 },
  };
  next = checkPhaseResult(next);
  return next;
}

function handleTick(state: GameState, deltaMs: number): GameState {
  if (
    state.phase !== "combat" &&
    state.phase !== "input" &&
    state.phase !== "targeting"
  ) {
    return state;
  }

  const cappedDelta = Math.min(deltaMs, 50);
  const worldDelta = getWorldDeltaMs(state, cappedDelta);
  let next = tickCategoryCooldowns(state, cappedDelta);
  next = tickCastInputTimer(next, cappedDelta);

  if (next.phase === "combat") {
    next = applyPlayerMovement(next, cappedDelta);
  } else if (next.phase === "targeting") {
    next = applyReticleMovement(next, cappedDelta);
  }

  next = tickManaRegen(next, cappedDelta);
  next = tickSkillCooldowns(next, cappedDelta);
  next = tickMinions(next, worldDelta);
  next = tickEnemy(next, worldDelta);
  next = tickProjectiles(next, worldDelta);
  next = decayVisualFlags(next, worldDelta);
  next = updateCameraFollow(next);
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
        return {
          ...state,
          arena,
          camera: updateCamera(state.playerPosition, arena, state.worldSize),
        };
      }
      return {
        ...state,
        arena,
        camera: updateCamera(state.playerPosition, arena, state.worldSize),
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

    case "CANCEL_TARGET":
      if (state.phase !== "targeting") return state;
      return {
        ...state,
        phase: "combat",
        pendingGroundSkillId: null,
        targetingReticle: null,
        moveInput: { x: 0, y: 0 },
        combatLog: appendLog(state.combatLog, "Targeting cancelled."),
      };

    case "CONFIRM_TARGET":
      return confirmGroundTarget(state);

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

      if (isGroundTargetPattern(skill.pattern)) {
        return beginGroundTargeting(state, skill.id);
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
