import { SLOW_MOTION_TIME_SCALE } from "./constants";
import type { GameState } from "./gameState";

export function getWorldDeltaMs(state: GameState, deltaMs: number): number {
  return state.isSlowMotion ? deltaMs * SLOW_MOTION_TIME_SCALE : deltaMs;
}
