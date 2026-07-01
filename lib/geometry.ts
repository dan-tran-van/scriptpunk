import { HUD_PADDING } from "./constants";
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
