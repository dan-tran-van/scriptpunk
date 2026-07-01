import type { ArenaSize, Vec2 } from "./gameState";

export function updateCamera(
  player: Vec2,
  viewport: ArenaSize,
  world: ArenaSize,
): Vec2 {
  const x = player.x - viewport.width / 2;
  const y = player.y - viewport.height / 2;

  const maxX = Math.max(0, world.width - viewport.width);
  const maxY = Math.max(0, world.height - viewport.height);

  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}
