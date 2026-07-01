import {
  BOSS_HITBOX,
  BURST_DURATION_MS,
  BEAM_DURATION_MS,
  CAST_GLOW_MS,
  DIRECTIONAL_PROJECTILE_SPEED,
  HIT_FLASH_MS,
  PLAYER_HITBOX,
  RANGE_UNIT,
  TARGETED_PROJECTILE_SPEED,
} from "./constants";
import { distance, lerpVec2 } from "./geometry";
import { appendLog, type GameState, type Projectile, type Vec2 } from "./gameState";
import { restoreManaOnBossHit } from "./mana";
import type { BossSkill } from "./bossSkills";
import type { PlayerSkill } from "./playerSkills";

function makeProjectile(state: GameState, partial: Omit<Projectile, "id">): Projectile {
  return { id: `p-${state.nextProjectileId}`, ...partial };
}

export function spawnPlayerSkill(state: GameState, skill: PlayerSkill): GameState {
  const originX = state.playerPosition.x;
  const originY = state.playerPosition.y;
  const dir = state.playerDirection;
  const aoeRadius = skill.aoeRadius ?? skill.range * RANGE_UNIT;

  if (skill.pattern === "defensive") {
    return {
      ...state,
      playerBarrierHits: state.playerBarrierHits + 1,
      playerCastingGlow: true,
      playerCastingGlowMs: CAST_GLOW_MS,
      combatLog: appendLog(state.combatLog, `${skill.name} — barrier active!`),
    };
  }

  let projectile: Projectile;

  switch (skill.pattern) {
    case "directional": {
      const maxTravel = skill.maxTravel ?? skill.range * RANGE_UNIT;
      projectile = makeProjectile(state, {
        owner: "player",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "directional",
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: originX + dir.x * maxTravel,
        targetY: originY + dir.y * maxTravel,
        dirX: dir.x,
        dirY: dir.y,
        maxTravel,
        traveled: 0,
        progress: 0,
        range: skill.range,
        aoeRadius,
      });
      break;
    }
    case "targeted":
      projectile = makeProjectile(state, {
        owner: "player",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "targeted",
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: state.enemyPosition.x,
        targetY: state.enemyPosition.y,
        dirX: 0,
        dirY: 0,
        maxTravel: skill.range * RANGE_UNIT,
        traveled: 0,
        progress: 0,
        range: skill.range,
        aoeRadius,
      });
      break;
    case "aoe_self":
      projectile = makeProjectile(state, {
        owner: "player",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "aoe_self",
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: originX,
        targetY: originY,
        dirX: 0,
        dirY: 0,
        maxTravel: 0,
        traveled: 0,
        progress: 0,
        range: skill.range,
        aoeRadius,
      });
      break;
    default:
      return state;
  }

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

export function spawnBossSkill(
  state: GameState,
  skill: BossSkill,
  snapshotTarget: Vec2,
): GameState {
  const originX = state.enemyPosition.x;
  const originY = state.enemyPosition.y;
  const dir = state.bossDirection;
  const aoeRadius = skill.aoeRadius ?? BOSS_HITBOX;

  let projectile: Projectile;

  switch (skill.pattern) {
    case "directional": {
      const maxTravel = skill.maxTravel ?? 300;
      projectile = makeProjectile(state, {
        owner: "boss",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "directional",
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: snapshotTarget.x,
        targetY: snapshotTarget.y,
        dirX: dir.x,
        dirY: dir.y,
        maxTravel,
        traveled: 0,
        progress: 0,
        range: 0,
        aoeRadius,
      });
      break;
    }
    case "aoe_self":
      projectile = makeProjectile(state, {
        owner: "boss",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "aoe_self",
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: originX,
        targetY: originY,
        dirX: 0,
        dirY: 0,
        maxTravel: 0,
        traveled: 0,
        progress: 0,
        range: 0,
        aoeRadius,
      });
      break;
    case "aoe_target":
      projectile = makeProjectile(state, {
        owner: "boss",
        skillName: skill.name,
        damage: skill.damage,
        animation: skill.animation,
        pattern: "aoe_target",
        x: snapshotTarget.x,
        y: snapshotTarget.y,
        originX: snapshotTarget.x,
        originY: snapshotTarget.y,
        targetX: snapshotTarget.x,
        targetY: snapshotTarget.y,
        dirX: 0,
        dirY: 0,
        maxTravel: 0,
        traveled: 0,
        progress: 0,
        range: 0,
        aoeRadius,
      });
      break;
    default:
      return state;
  }

  return {
    ...state,
    nextProjectileId: state.nextProjectileId + 1,
    activeProjectiles: [...state.activeProjectiles, projectile],
    combatLog: appendLog(state.combatLog, `Boss casts ${skill.name}!`),
  };
}

function progressSpeed(p: Projectile): number {
  if (p.pattern === "directional") return 0;
  if (p.animation === "burst") return 1 / BURST_DURATION_MS;
  if (p.animation === "beam") return 1 / BEAM_DURATION_MS;
  return TARGETED_PROJECTILE_SPEED;
}

function advanceProjectile(p: Projectile, deltaMs: number): Projectile {
  if (p.pattern === "directional") {
    const step = DIRECTIONAL_PROJECTILE_SPEED * deltaMs;
    const traveled = p.traveled + step;
    return {
      ...p,
      traveled,
      x: p.originX + p.dirX * traveled,
      y: p.originY + p.dirY * traveled,
      progress: Math.min(1, traveled / Math.max(1, p.maxTravel)),
    };
  }

  if (p.pattern === "targeted") {
    const progress = Math.min(1, p.progress + progressSpeed(p) * deltaMs);
    const pos = lerpVec2(
      { x: p.originX, y: p.originY },
      { x: p.targetX, y: p.targetY },
      progress,
    );
    return { ...p, progress, x: pos.x, y: pos.y };
  }

  const progress = Math.min(1, p.progress + progressSpeed(p) * deltaMs);
  return { ...p, progress };
}

function opponentPos(state: GameState, owner: Projectile["owner"]): Vec2 {
  return owner === "player" ? state.enemyPosition : state.playerPosition;
}

function opponentHitbox(owner: Projectile["owner"]): number {
  return owner === "player" ? BOSS_HITBOX : PLAYER_HITBOX;
}

function isResolved(p: Projectile): boolean {
  if (p.pattern === "directional") return p.traveled >= p.maxTravel;
  return p.progress >= 1;
}

function collides(p: Projectile, target: Vec2, hitbox: number): boolean {
  return distance({ x: p.x, y: p.y }, target) < hitbox + 8;
}

function applyPlayerHit(state: GameState, damage: number, skillName: string): GameState {
  if (state.playerBarrierHits > 0) {
    return {
      ...state,
      playerBarrierHits: state.playerBarrierHits - 1,
      playerHitFlash: true,
      playerHitFlashMs: HIT_FLASH_MS,
      combatLog: appendLog(state.combatLog, `Barrier blocked ${skillName}!`),
    };
  }

  return restoreManaOnBossHit({
    ...state,
    playerHP: Math.max(0, state.playerHP - damage),
    playerHitFlash: true,
    playerHitFlashMs: HIT_FLASH_MS,
    combatLog: appendLog(state.combatLog, `${skillName} hits you for ${damage}!`),
  });
}

function applyBossHit(state: GameState, damage: number, skillName: string): GameState {
  if (damage <= 0) return state;
  return {
    ...state,
    enemyHP: Math.max(0, state.enemyHP - damage),
    enemyHitFlash: true,
    enemyHitFlashMs: HIT_FLASH_MS,
    combatLog: appendLog(state.combatLog, `${skillName} hits boss for ${damage}!`),
  };
}

function resolveProjectile(state: GameState, p: Projectile): GameState {
  const target = opponentPos(state, p.owner);
  const hitbox = opponentHitbox(p.owner);

  if (p.owner === "player") {
    if (p.pattern === "directional" || p.pattern === "targeted") {
      if (collides(p, target, hitbox)) {
        return applyBossHit(state, p.damage, p.skillName);
      }
      return { ...state, combatLog: appendLog(state.combatLog, `${p.skillName} missed!`) };
    }
    if (p.pattern === "aoe_self") {
      const dist = distance({ x: p.originX, y: p.originY }, target);
      if (dist <= p.aoeRadius) {
        return applyBossHit(state, p.damage, p.skillName);
      }
      return { ...state, combatLog: appendLog(state.combatLog, `${p.skillName} missed!`) };
    }
  } else {
    if (p.pattern === "directional" || p.pattern === "targeted") {
      if (collides(p, target, hitbox)) {
        return applyPlayerHit(state, p.damage, p.skillName);
      }
      return { ...state, combatLog: appendLog(state.combatLog, `Boss ${p.skillName} missed!`) };
    }
    if (p.pattern === "aoe_self") {
      const dist = distance({ x: p.originX, y: p.originY }, target);
      if (dist <= p.aoeRadius) {
        return applyPlayerHit(state, p.damage, p.skillName);
      }
      return { ...state, combatLog: appendLog(state.combatLog, `Boss ${p.skillName} missed!`) };
    }
    if (p.pattern === "aoe_target") {
      const dist = distance({ x: p.targetX, y: p.targetY }, target);
      if (dist <= p.aoeRadius) {
        return applyPlayerHit(state, p.damage, p.skillName);
      }
      return { ...state, combatLog: appendLog(state.combatLog, `Boss ${p.skillName} missed!`) };
    }
  }

  return state;
}

export function tickProjectiles(state: GameState, deltaMs: number): GameState {
  if (state.activeProjectiles.length === 0) return state;

  let next = state;
  const remaining: Projectile[] = [];

  for (const raw of state.activeProjectiles) {
    const p = advanceProjectile(raw, deltaMs);

    if (p.pattern === "directional" || p.pattern === "targeted") {
      const target = opponentPos(next, p.owner);
      const hitbox = opponentHitbox(p.owner);
      if (collides(p, target, hitbox)) {
        next = resolveProjectile(next, p);
        continue;
      }
    }

    if (!isResolved(p)) {
      remaining.push(p);
      continue;
    }

    next = resolveProjectile(next, p);
  }

  return {
    ...next,
    activeProjectiles: remaining,
    activeSkill: remaining.length > 0 ? next.activeSkill : null,
  };
}
