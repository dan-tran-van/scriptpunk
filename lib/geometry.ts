import { BOSS_HITBOX, HUD_PADDING, PLAYER_HITBOX } from "./constants";
import {
  getMapWorldSize,
  isWalkableWorld,
  tileToWorldCenter,
  type MapData,
} from "./map";
import type { ArenaSize, Vec2 } from "./gameState";

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(from: Vec2, to: Vec2, t: number): Vec2 {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
  };
}

export function clampPosition(pos: Vec2, arena: ArenaSize): Vec2 {
  const minX = HUD_PADDING.left;
  const maxX = arena.width - HUD_PADDING.right;
  const minY = HUD_PADDING.top;
  const maxY = arena.height - HUD_PADDING.bottom;

  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}

export function getPlayerSpawn(arena: ArenaSize): Vec2 {
  return { x: arena.width / 2, y: arena.height - HUD_PADDING.bottom };
}

export function getBossSpawn(arena: ArenaSize): Vec2 {
  return { x: arena.width / 2, y: HUD_PADDING.top + 20 };
}

export function findWalkableNear(
  map: MapData,
  target: Vec2,
  searchRadius: number,
  entityRadius: number,
): Vec2 {
  if (isWalkableWorld(map, target.x, target.y, entityRadius)) {
    return target;
  }

  const step = 16;
  for (let r = step; r <= searchRadius; r += step) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = target.x + Math.cos(angle) * r;
      const y = target.y + Math.sin(angle) * r;
      if (isWalkableWorld(map, x, y, entityRadius)) {
        return { x, y };
      }
    }
  }

  const world = getMapWorldSize(map);
  const cx = world.width / 2;
  const cy = world.height / 2;
  const tx = Math.floor(cx / 32);
  const ty = Math.floor(cy / 32);
  return tileToWorldCenter(tx, ty);
}

export function randomWalkablePosition(
  map: MapData,
  entityRadius: number,
  exclude: Vec2[] = [],
  minDist = 120,
): Vec2 {
  const world = getMapWorldSize(map);
  for (let i = 0; i < 80; i++) {
    const x = entityRadius + Math.random() * (world.width - entityRadius * 2);
    const y = entityRadius + Math.random() * (world.height - entityRadius * 2);
    if (!isWalkableWorld(map, x, y, entityRadius)) continue;
    if (exclude.some((e) => distance({ x, y }, e) < minDist)) continue;
    return { x, y };
  }
  return findWalkableNear(
    map,
    { x: world.width / 2, y: world.height / 2 },
    400,
    entityRadius,
  );
}

export function getPlayerSpawnForMap(map: MapData): Vec2 {
  const world = getMapWorldSize(map);
  return findWalkableNear(
    map,
    { x: world.width / 2, y: world.height - 96 },
    300,
    PLAYER_HITBOX,
  );
}

export function getBossSpawnForMap(map: MapData): Vec2 {
  const world = getMapWorldSize(map);
  return findWalkableNear(
    map,
    { x: world.width / 2, y: 96 },
    300,
    BOSS_HITBOX,
  );
}

export function randomPositionInArena(arena: ArenaSize): Vec2 {
  const minX = HUD_PADDING.left + 20;
  const maxX = arena.width - HUD_PADDING.right - 20;
  const minY = HUD_PADDING.top + 20;
  const maxY = arena.height - HUD_PADDING.bottom - 20;

  return {
    x: minX + Math.random() * (maxX - minX),
    y: minY + Math.random() * (maxY - minY),
  };
}

export function normalizeInput(dx: number, dy: number): Vec2 {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}
