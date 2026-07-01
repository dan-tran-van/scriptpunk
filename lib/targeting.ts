import { distance } from "./geometry";
import type { Vec2 } from "./gameState";

export type TargetInputMode = "keyboard" | "pointer";

export function clampReticleToRange(
  origin: Vec2,
  target: Vec2,
  rangePx: number,
): Vec2 {
  const dist = distance(origin, target);
  if (dist <= rangePx || dist === 0) return target;
  const t = rangePx / dist;
  return {
    x: origin.x + (target.x - origin.x) * t,
    y: origin.y + (target.y - origin.y) * t,
  };
}

export function reticleFromPointer(
  clientX: number,
  clientY: number,
  worldLayerRect: DOMRect,
  camera: Vec2,
): Vec2 {
  return {
    x: clientX - worldLayerRect.left + camera.x,
    y: clientY - worldLayerRect.top + camera.y,
  };
}

export function isGroundTargetPattern(pattern: string): boolean {
  return pattern === "ground_point" || pattern === "ground_aoe";
}
