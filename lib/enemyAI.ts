import {
  BOSS_ATTACK_MS,
  BOSS_DRIFT_INTERVAL_MS,
} from "./constants";
import { getBossSkillById, pickRandomBossSkillFromPool } from "./bossSkills";
import { distance, normalizeInput, randomWalkablePosition } from "./geometry";
import { getMapData } from "./maps";
import { getMapWorldSize, resolveMovement } from "./map";
import { BOSS_HITBOX } from "./constants";
import { appendLog, type GameState, type Vec2 } from "./gameState";
import { getLevelConfig } from "./levels";
import { spawnBossSkill } from "./projectiles";

export function tickEnemy(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input" && state.phase !== "targeting") {
    return state;
  }

  let next = tickBossDrift(state, deltaMs);
  next = tickBossAttack(next, deltaMs);
  return next;
}

function directionToward(from: Vec2, to: Vec2) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return normalizeInput(dx, dy);
}

function tickBossDrift(state: GameState, deltaMs: number): GameState {
  const config = getLevelConfig(state.level);
  const map = getMapData(state.mapId);
  const world = getMapWorldSize(map);
  let { bossDriftTimer, bossDriftTarget, enemyPosition, bossState } = state;

  if (bossState === "windup" || bossState === "attacking") {
    return state;
  }

  bossDriftTimer -= deltaMs;
  if (bossDriftTimer <= 0) {
    bossDriftTimer = BOSS_DRIFT_INTERVAL_MS;
    bossDriftTarget = randomWalkablePosition(map, BOSS_HITBOX, [
      state.playerPosition,
      enemyPosition,
    ]);
  }

  let bossDirection = state.bossDirection;

  if (bossDriftTarget) {
    const dist = distance(enemyPosition, bossDriftTarget);
    if (dist < 4) {
      bossState = "idle";
      bossDriftTarget = null;
    } else {
      bossDirection = directionToward(enemyPosition, bossDriftTarget);
      const step = Math.min(config.bossDriftSpeed * deltaMs, dist);
      const proposed = {
        x: enemyPosition.x + ((bossDriftTarget.x - enemyPosition.x) / dist) * step,
        y: enemyPosition.y + ((bossDriftTarget.y - enemyPosition.y) / dist) * step,
      };
      enemyPosition = resolveMovement(
        map,
        enemyPosition,
        proposed,
        BOSS_HITBOX,
        world,
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
    bossDirection,
  };
}

function tickBossAttack(state: GameState, deltaMs: number): GameState {
  const config = getLevelConfig(state.level);
  let { bossAttackCooldown, bossWindupRemaining, bossAttackRemaining } = state;
  const { bossState, combatLog } = state;

  if (bossState === "windup") {
    bossWindupRemaining -= deltaMs;
    const skill = state.bossActiveSkill
      ? getBossSkillById(state.bossActiveSkill)
      : undefined;

    if (bossWindupRemaining <= 0 && skill) {
      const snapshot = { ...state.playerPosition };
      const bossDirection = directionToward(state.enemyPosition, snapshot);

      let next: GameState = {
        ...state,
        bossState: "attacking",
        bossAttackRemaining: BOSS_ATTACK_MS,
        bossWindupRemaining: 0,
        bossDirection,
        bossAoETarget: skill.pattern === "aoe_target" ? snapshot : null,
      };

      next = spawnBossSkill(next, skill, snapshot);
      return next;
    }

    return { ...state, bossWindupRemaining, bossState };
  }

  if (bossState === "attacking") {
    bossAttackRemaining -= deltaMs;
    if (bossAttackRemaining <= 0) {
      return {
        ...state,
        bossState: "idle",
        bossAttackCooldown: config.bossAttackCooldownMs,
        bossActiveSkill: null,
        bossAoETarget: null,
      };
    }
    return { ...state, bossAttackRemaining, bossState };
  }

  bossAttackCooldown -= deltaMs;
  if (bossAttackCooldown <= 0) {
    const skill = pickRandomBossSkillFromPool(config.bossSkillIds);
    const bossDirection = directionToward(
      state.enemyPosition,
      state.playerPosition,
    );
    const bossAoETarget =
      skill.pattern === "aoe_target" ? { ...state.playerPosition } : null;

    return {
      ...state,
      bossState: "windup",
      bossWindupRemaining: skill.windupMs,
      bossAttackCooldown: 0,
      bossActiveSkill: skill.id,
      bossDirection,
      bossAoETarget,
      combatLog: appendLog(combatLog, `Boss prepares ${skill.name}!`),
    };
  }

  return { ...state, bossAttackCooldown };
}
