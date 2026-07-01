import {
  BOSS_ATTACK_COOLDOWN_MS,
  BOSS_ATTACK_MS,
  BOSS_DRIFT_INTERVAL_MS,
  BOSS_DRIFT_SPEED,
  BOSS_MELEE_DAMAGE,
  BOSS_MELEE_RANGE,
  BOSS_WINDUP_MS,
  HIT_FLASH_MS,
} from "./constants";
import { clampPosition, distance, randomPositionInArena } from "./geometry";
import { appendLog, type GameState } from "./gameState";

export function tickEnemy(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input") return state;
  if (state.phase === "input") return state;

  let next = tickBossDrift(state, deltaMs);
  next = tickBossAttack(next, deltaMs);
  return next;
}

function tickBossDrift(state: GameState, deltaMs: number): GameState {
  let { bossDriftTimer, bossDriftTarget, enemyPosition, bossState } = state;

  if (bossState === "windup" || bossState === "attacking") {
    return state;
  }

  bossDriftTimer -= deltaMs;
  if (bossDriftTimer <= 0) {
    bossDriftTimer = BOSS_DRIFT_INTERVAL_MS;
    bossDriftTarget = randomPositionInArena(state.arena);
  }

  if (bossDriftTarget) {
    const dist = distance(enemyPosition, bossDriftTarget);
    if (dist < 4) {
      bossState = "idle";
      bossDriftTarget = null;
    } else {
      const step = Math.min(BOSS_DRIFT_SPEED * deltaMs, dist);
      enemyPosition = clampPosition(
        {
          x: enemyPosition.x + ((bossDriftTarget.x - enemyPosition.x) / dist) * step,
          y: enemyPosition.y + ((bossDriftTarget.y - enemyPosition.y) / dist) * step,
        },
        state.arena,
      );
      bossState = "moving";
    }
  }

  return {
    ...state,
    bossDriftTimer,
    bossDriftTarget,
    enemyPosition,
    bossState,
  };
}

function tickBossAttack(state: GameState, deltaMs: number): GameState {
  let { bossAttackCooldown, bossWindupRemaining, bossAttackRemaining } = state;
  const { bossState, playerHP, playerHitFlash, playerHitFlashMs, combatLog } = state;

  if (bossState === "windup") {
    bossWindupRemaining -= deltaMs;
    if (bossWindupRemaining <= 0) {
      const inRange =
        distance(state.enemyPosition, state.playerPosition) < BOSS_MELEE_RANGE;
      let nextPlayerHP = playerHP;
      let nextPlayerHitFlash = playerHitFlash;
      let nextPlayerHitFlashMs = playerHitFlashMs;
      let nextCombatLog = combatLog;

      if (inRange) {
        nextPlayerHP = Math.max(0, playerHP - BOSS_MELEE_DAMAGE);
        nextPlayerHitFlash = true;
        nextPlayerHitFlashMs = HIT_FLASH_MS;
        nextCombatLog = appendLog(
          combatLog,
          `Boss strikes you for ${BOSS_MELEE_DAMAGE} damage!`,
        );
      } else {
        nextCombatLog = appendLog(combatLog, "Boss attack missed!");
      }

      return {
        ...state,
        bossState: "attacking",
        bossAttackRemaining: BOSS_ATTACK_MS,
        bossWindupRemaining: 0,
        playerHP: nextPlayerHP,
        playerHitFlash: nextPlayerHitFlash,
        playerHitFlashMs: nextPlayerHitFlashMs,
        combatLog: nextCombatLog,
      };
    }
    return { ...state, bossWindupRemaining, bossState };
  }

  if (bossState === "attacking") {
    bossAttackRemaining -= deltaMs;
    if (bossAttackRemaining <= 0) {
      return {
        ...state,
        bossState: "idle",
        bossAttackCooldown: BOSS_ATTACK_COOLDOWN_MS,
      };
    }
    return { ...state, bossAttackRemaining, bossState };
  }

  bossAttackCooldown -= deltaMs;
  if (bossAttackCooldown <= 0) {
    return {
      ...state,
      bossState: "windup",
      bossWindupRemaining: BOSS_WINDUP_MS,
      bossAttackCooldown: 0,
      combatLog: appendLog(state.combatLog, "Boss is winding up an attack!"),
    };
  }

  return { ...state, bossAttackCooldown };
}
