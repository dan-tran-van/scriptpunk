import {
  BURST_DURATION_MS,
  BEAM_DURATION_MS,
  CAST_GLOW_MS,
  HIT_FLASH_MS,
  HIT_RADIUS,
  PROJECTILE_SPEED,
  RANGE_UNIT,
} from "./constants";
import { distance, lerpVec2 } from "./geometry";
import { appendLog, type GameState, type Projectile } from "./gameState";
import type { Skill } from "./skills";

export function spawnProjectile(state: GameState, skill: Skill): GameState {
  const id = `p-${state.nextProjectileId}`;
  const originX = state.playerPosition.x;
  const originY = state.playerPosition.y;

  const projectile: Projectile = {
    id,
    skillName: skill.name,
    damage: skill.damage,
    animation: skill.animation,
    x: originX,
    y: originY,
    originX,
    originY,
    targetX: state.enemyPosition.x,
    targetY: state.enemyPosition.y,
    progress: 0,
    range: skill.range,
    resolved: false,
  };

  return {
    ...state,
    nextProjectileId: state.nextProjectileId + 1,
    activeSkill: skill.name,
    activeProjectiles: [...state.activeProjectiles, projectile],
    playerCastingGlow: true,
    playerCastingGlowMs: CAST_GLOW_MS,
    combatLog: appendLog(state.combatLog, `Cast ${skill.name}!`),
  };
}

function progressSpeed(animation: Projectile["animation"]): number {
  switch (animation) {
    case "burst":
      return 1 / BURST_DURATION_MS;
    case "beam":
      return 1 / BEAM_DURATION_MS;
    default:
      return PROJECTILE_SPEED;
  }
}

function bossInRange(state: GameState, projectile: Projectile): boolean {
  const maxRange = projectile.range * RANGE_UNIT;
  if (maxRange <= 0) return false;
  const fromPlayer = distance(state.playerPosition, state.enemyPosition);
  const fromEffect = distance(
    { x: projectile.x, y: projectile.y },
    state.enemyPosition,
  );
  return fromPlayer <= maxRange || fromEffect <= maxRange;
}

function applyHit(state: GameState, projectile: Projectile): GameState {
  if (projectile.damage <= 0) {
    return {
      ...state,
      combatLog: appendLog(state.combatLog, `${projectile.skillName} activated.`),
    };
  }

  if (!bossInRange(state, projectile)) {
    return {
      ...state,
      combatLog: appendLog(state.combatLog, `${projectile.skillName} missed!`),
    };
  }

  return {
    ...state,
    enemyHP: Math.max(0, state.enemyHP - projectile.damage),
    enemyHitFlash: true,
    enemyHitFlashMs: HIT_FLASH_MS,
    combatLog: appendLog(
      state.combatLog,
      `${projectile.skillName} hits for ${projectile.damage} damage!`,
    ),
  };
}

function advanceProjectile(p: Projectile, deltaMs: number): Projectile {
  const progress = Math.min(1, p.progress + progressSpeed(p.animation) * deltaMs);
  const pos = lerpVec2(
    { x: p.originX, y: p.originY },
    { x: p.targetX, y: p.targetY },
    progress,
  );
  return { ...p, progress, x: pos.x, y: pos.y };
}

function shouldResolve(state: GameState, p: Projectile): boolean {
  const dist = distance({ x: p.x, y: p.y }, state.enemyPosition);
  if (p.animation === "projectile") {
    return dist < HIT_RADIUS || p.progress >= 1;
  }
  return p.progress >= 1;
}

export function tickProjectiles(state: GameState, deltaMs: number): GameState {
  if (state.activeProjectiles.length === 0) return state;

  let next = state;
  const remaining: Projectile[] = [];

  for (const raw of state.activeProjectiles) {
    const tracked: Projectile = {
      ...raw,
      targetX: next.enemyPosition.x,
      targetY: next.enemyPosition.y,
    };
    const p = advanceProjectile(tracked, deltaMs);

    if (!shouldResolve(next, p)) {
      remaining.push(p);
      continue;
    }

    next = applyHit(next, p);
  }

  return {
    ...next,
    activeProjectiles: remaining,
    activeSkill: remaining.length > 0 ? next.activeSkill : null,
  };
}
