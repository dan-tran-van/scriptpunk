import { PLAYER_MAX_HP, PLAYER_MAX_MANA } from "./constants";
import { getBossSpawn, getPlayerSpawn } from "./geometry";
import { getLevelConfig } from "./levels";

export type Vec2 = { x: number; y: number };
export type Direction = Vec2;
export type ArenaSize = { width: number; height: number };

export type GamePhase = "idle" | "combat" | "input" | "result";
export type BossState = "idle" | "moving" | "windup" | "attacking";
export type SkillCategory = "assault" | "arcane";
export type SkillAnimation = "projectile" | "burst" | "beam";
export type SkillPattern =
  | "directional"
  | "targeted"
  | "aoe_self"
  | "aoe_target"
  | "defensive";

export type Projectile = {
  id: string;
  owner: "player" | "boss";
  skillName: string;
  damage: number;
  animation: SkillAnimation;
  pattern: SkillPattern;
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  dirX: number;
  dirY: number;
  maxTravel: number;
  traveled: number;
  progress: number;
  range: number;
  aoeRadius: number;
};

export type GameState = {
  phase: GamePhase;
  playerHP: number;
  enemyHP: number;
  playerMana: number;
  playerMaxMana: number;
  playerBarrierHits: number;
  playerPosition: Vec2;
  enemyPosition: Vec2;
  playerDirection: Direction;
  bossDirection: Direction;
  activeSkill: string | null;
  activeCastCategory: SkillCategory | null;
  arena: ArenaSize;
  bossState: BossState;
  bossAttackCooldown: number;
  bossWindupRemaining: number;
  bossAttackRemaining: number;
  bossActiveSkill: string | null;
  bossAoETarget: Vec2 | null;
  bossDriftTimer: number;
  bossDriftTarget: Vec2 | null;
  activeProjectiles: Projectile[];
  nextProjectileId: number;
  skillCooldowns: Record<string, number>;
  categoryCooldowns: Record<SkillCategory, number>;
  castInputRemainingMs: number;
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
  level: number;
  bossMaxHp: number;
};

export type GameAction =
  | { type: "START_BATTLE"; level?: number }
  | { type: "NEXT_LEVEL" }
  | { type: "RETRY_LEVEL" }
  | { type: "RESTART" }
  | { type: "RESIZE_ARENA"; width: number; height: number }
  | { type: "PLAYER_MOVE"; dx: number; dy: number }
  | { type: "BEGIN_CAST"; category: SkillCategory }
  | { type: "CANCEL_CAST" }
  | { type: "SUBMIT_SKILL"; input: string }
  | { type: "TICK"; deltaMs: number };

const DEFAULT_DIRECTION: Direction = { x: 0, y: -1 };

export const EMPTY_CATEGORY_COOLDOWNS: Record<SkillCategory, number> = {
  assault: 0,
  arcane: 0,
};

function appendLog(log: string[], message: string): string[] {
  const next = [...log, message];
  return next.slice(-8);
}

export function createInitialState(arena: ArenaSize): GameState {
  const levelConfig = getLevelConfig(1);
  return {
    phase: "idle",
    playerHP: PLAYER_MAX_HP,
    enemyHP: levelConfig.bossMaxHp,
    playerMana: PLAYER_MAX_MANA,
    playerMaxMana: PLAYER_MAX_MANA,
    playerBarrierHits: 0,
    playerPosition: getPlayerSpawn(arena),
    enemyPosition: getBossSpawn(arena),
    playerDirection: { ...DEFAULT_DIRECTION },
    bossDirection: { ...DEFAULT_DIRECTION },
    activeSkill: null,
    activeCastCategory: null,
    arena,
    bossState: "idle",
    bossAttackCooldown: 2000,
    bossWindupRemaining: 0,
    bossAttackRemaining: 0,
    bossActiveSkill: null,
    bossAoETarget: null,
    bossDriftTimer: 0,
    bossDriftTarget: null,
    activeProjectiles: [],
    nextProjectileId: 1,
    skillCooldowns: {},
    categoryCooldowns: { ...EMPTY_CATEGORY_COOLDOWNS },
    castInputRemainingMs: 0,
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
    level: 1,
    bossMaxHp: levelConfig.bossMaxHp,
  };
}

export function createCombatState(arena: ArenaSize, level: number): GameState {
  const config = getLevelConfig(level);
  const base = createInitialState(arena);
  return {
    ...base,
    phase: "combat",
    level: config.id,
    bossMaxHp: config.bossMaxHp,
    enemyHP: config.bossMaxHp,
    playerPosition: getPlayerSpawn(arena),
    enemyPosition: getBossSpawn(arena),
    playerMana: PLAYER_MAX_MANA,
    bossAttackCooldown: config.bossFirstAttackDelayMs,
    combatLog: appendLog(
      [],
      `Level ${config.id}: ${config.title} — [Q] Assault  [E] Arcane`,
    ),
  };
}

export { appendLog };
