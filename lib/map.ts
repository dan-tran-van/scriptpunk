import type { ArenaSize, Vec2 } from "./gameState";

export const TILE_SIZE = 32;

export type TileType = "floor" | "rock" | "tree" | "house";

export type MapData = {
  id: string;
  width: number;
  height: number;
  tiles: TileType[];
};

const BLOCKED: Record<TileType, boolean> = {
  floor: false,
  rock: true,
  tree: true,
  house: true,
};

export function isTileBlocked(type: TileType): boolean {
  return BLOCKED[type];
}

export function getMapWorldSize(map: MapData): ArenaSize {
  return { width: map.width * TILE_SIZE, height: map.height * TILE_SIZE };
}

export function worldToTile(map: MapData, x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(x / TILE_SIZE),
    ty: Math.floor(y / TILE_SIZE),
  };
}

export function tileToWorldCenter(tx: number, ty: number): Vec2 {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function getTile(map: MapData, tx: number, ty: number): TileType | null {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return null;
  return map.tiles[ty * map.width + tx] ?? null;
}

export function isBlocked(map: MapData, tx: number, ty: number): boolean {
  const tile = getTile(map, tx, ty);
  if (!tile) return true;
  return isTileBlocked(tile);
}

function circleIntersectsBlockedTile(
  map: MapData,
  x: number,
  y: number,
  radius: number,
): boolean {
  const minTx = Math.floor((x - radius) / TILE_SIZE);
  const maxTx = Math.floor((x + radius) / TILE_SIZE);
  const minTy = Math.floor((y - radius) / TILE_SIZE);
  const maxTy = Math.floor((y + radius) / TILE_SIZE);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isBlocked(map, tx, ty)) continue;
      const tileLeft = tx * TILE_SIZE;
      const tileTop = ty * TILE_SIZE;
      const tileRight = tileLeft + TILE_SIZE;
      const tileBottom = tileTop + TILE_SIZE;
      const closestX = Math.max(tileLeft, Math.min(x, tileRight));
      const closestY = Math.max(tileTop, Math.min(y, tileBottom));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

export function clampToWorld(pos: Vec2, world: ArenaSize, radius: number): Vec2 {
  return {
    x: Math.max(radius, Math.min(world.width - radius, pos.x)),
    y: Math.max(radius, Math.min(world.height - radius, pos.y)),
  };
}

export function resolveMovement(
  map: MapData,
  from: Vec2,
  to: Vec2,
  radius: number,
  world: ArenaSize,
): Vec2 {
  let pos = clampToWorld(to, world, radius);

  if (!circleIntersectsBlockedTile(map, pos.x, pos.y, radius)) {
    return pos;
  }

  const slideX = { x: pos.x, y: from.y };
  if (!circleIntersectsBlockedTile(map, slideX.x, slideX.y, radius)) {
    pos = slideX;
  } else {
    const slideY = { x: from.x, y: pos.y };
    if (!circleIntersectsBlockedTile(map, slideY.x, slideY.y, radius)) {
      pos = slideY;
    } else {
      return from;
    }
  }

  if (circleIntersectsBlockedTile(map, pos.x, pos.y, radius)) {
    return from;
  }
  return pos;
}

export function isWalkableWorld(map: MapData, x: number, y: number, radius: number): boolean {
  const world = getMapWorldSize(map);
  if (x < radius || y < radius || x > world.width - radius || y > world.height - radius) {
    return false;
  }
  return !circleIntersectsBlockedTile(map, x, y, radius);
}

export function createEmptyMap(id: string, width: number, height: number): MapData {
  return {
    id,
    width,
    height,
    tiles: Array.from({ length: width * height }, () => "floor" as TileType),
  };
}

export function setTile(map: MapData, tx: number, ty: number, type: TileType): void {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return;
  map.tiles[ty * map.width + tx] = type;
}

export function fillRect(
  map: MapData,
  x: number,
  y: number,
  w: number,
  h: number,
  type: TileType,
): void {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      setTile(map, tx, ty, type);
    }
  }
}

export function scatterDecorations(
  map: MapData,
  count: number,
  type: TileType,
  seed: number,
): void {
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < count * 40) {
    attempts++;
    const tx = 2 + Math.floor(rand() * (map.width - 4));
    const ty = 2 + Math.floor(rand() * (map.height - 4));
    if (getTile(map, tx, ty) !== "floor") continue;
    if (type === "house") {
      if (tx + 1 >= map.width || ty + 1 >= map.height) continue;
      if (
        getTile(map, tx + 1, ty) !== "floor" ||
        getTile(map, tx, ty + 1) !== "floor" ||
        getTile(map, tx + 1, ty + 1) !== "floor"
      ) {
        continue;
      }
      fillRect(map, tx, ty, 2, 2, "house");
    } else {
      setTile(map, tx, ty, type);
    }
    placed++;
  }
}
