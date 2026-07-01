import { BOSS_MAX_HP, PLAYER_MAX_HP } from "./constants";
import { getBossSpawn, getPlayerSpawn } from "./geometry";

export type Vec2 = { x: number; y: number };
export type ArenaSize = { width: number; height: number };

export type GamePhase = "idle" | "combat" | "input" | "result";
export type BossState = "idle" | "moving" | "windup" | "attacking";
export type SkillAnimation = "projectile" | "burst" | "beam";

export type Projectile = {
  id: string;
  skillName: string;
  damage: number;
  animation: SkillAnimation;
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  progress: number;
  range: number;
  resolved: boolean;
};

export type GameState = {
  phase: GamePhase;
  playerHP: number;
  enemyHP: number;
  playerPosition: Vec2;
  enemyPosition: Vec2;
  activeSkill: string | null;
  arena: ArenaSize;
  bossState: BossState;
  bossAttackCooldown: number;
  bossWindupRemaining: number;
  bossAttackRemaining: number;
  bossDriftTimer: number;
  bossDriftTarget: Vec2 | null;
  activeProjectiles: Projectile[];
  nextProjectileId: number;
  moveInput: Vec2;
  playerHitFlash: boolean;
  enemyHitFlash: boolean;
  playerCastingGlow: boolean;
  isSlowMotion: boolean;
  playerHitFlashMs: number;
  enemyHitFlashMs: number;
  playerCastingGlowMs: number;
  combatLog: string[];
  result: "victory" | "defeat" | null;
};

export type GameAction =
  | { type: "START_BATTLE" }
  | { type: "RESTART" }
  | { type: "RESIZE_ARENA"; width: number; height: number }
  | { type: "PLAYER_MOVE"; dx: number; dy: number }
  | { type: "BEGIN_CAST" }
  | { type: "CANCEL_CAST" }
  | { type: "SUBMIT_SKILL"; input: string }
  | { type: "TICK"; deltaMs: number };

function appendLog(log: string[], message: string): string[] {
  const next = [...log, message];
  return next.slice(-8);
}

export function createInitialState(arena: ArenaSize): GameState {
  return {
    phase: "idle",
    playerHP: PLAYER_MAX_HP,
    enemyHP: BOSS_MAX_HP,
    playerPosition: getPlayerSpawn(arena),
    enemyPosition: getBossSpawn(arena),
    activeSkill: null,
    arena,
    bossState: "idle",
    bossAttackCooldown: 2000,
    bossWindupRemaining: 0,
    bossAttackRemaining: 0,
    bossDriftTimer: 0,
    bossDriftTarget: null,
    activeProjectiles: [],
    nextProjectileId: 1,
    moveInput: { x: 0, y: 0 },
    playerHitFlash: false,
    enemyHitFlash: false,
    playerCastingGlow: false,
    isSlowMotion: false,
    playerHitFlashMs: 0,
    enemyHitFlashMs: 0,
    playerCastingGlowMs: 0,
    combatLog: [],
    result: null,
  };
}

export function createCombatState(arena: ArenaSize): GameState {
  const base = createInitialState(arena);
  return {
    ...base,
    phase: "combat",
    playerPosition: getPlayerSpawn(arena),
    enemyPosition: getBossSpawn(arena),
    bossAttackCooldown: 1500,
    combatLog: appendLog([], "Battle begins! Type skills to fight."),
  };
}

export { appendLog };
