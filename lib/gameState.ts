import { PLAYER_MAX_HP, PLAYER_MAX_MANA } from "./constants";
import { updateCamera } from "./camera";
import {
  findWalkableNear,
  getBossSpawnForMap,
  getPlayerSpawn,
  getPlayerSpawnForMap,
} from "./geometry";
import { getMapData } from "./maps";
import { getMapWorldSize } from "./map";
import { getLevelConfig } from "./levels";

export type Vec2 = { x: number; y: number };
export type Direction = Vec2;
export type ArenaSize = { width: number; height: number };

export type GamePhase = "idle" | "combat" | "input" | "targeting" | "result";
export type BossState = "idle" | "moving" | "windup" | "attacking";
export type SkillCategory = "assault" | "arcane";
export type SkillAnimation = "projectile" | "burst" | "beam";
export type SkillPattern =
  | "directional"
  | "targeted"
  | "aoe_self"
  | "aoe_target"
  | "ground_point"
  | "ground_aoe"
  | "defensive";

export type Minion = {
  id: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldownMs: number;
  attackRemaining: number;
};

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
  worldSize: ArenaSize;
  camera: Vec2;
  mapId: string;
  minions: Minion[];
  targetingReticle: Vec2 | null;
  pendingGroundSkillId: string | null;
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
  nextMinionId: number;
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
  | { type: "CONFIRM_TARGET" }
  | { type: "CANCEL_TARGET" }
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

function createMinionsFromLevel(level: number, mapId: string): Minion[] {
  const config = getLevelConfig(level);
  const map = getMapData(mapId);
  return config.minionSpawns.map((spawn, i) => {
    const position = findWalkableNear(map, spawn, 200, 14);
    return {
      id: `minion-${i + 1}`,
      position,
      hp: config.minionHp,
      maxHp: config.minionHp,
      speed: config.minionSpeed,
      damage: config.minionDamage,
      attackCooldownMs: 1500,
      attackRemaining: 500 + i * 200,
    };
  });
}

export function createInitialState(arena: ArenaSize): GameState {
  const levelConfig = getLevelConfig(1);
  const map = getMapData(levelConfig.mapId);
  const worldSize = getMapWorldSize(map);
  const playerPosition = getPlayerSpawn(arena);

  return {
    phase: "idle",
    playerHP: PLAYER_MAX_HP,
    enemyHP: levelConfig.bossMaxHp,
    playerMana: PLAYER_MAX_MANA,
    playerMaxMana: PLAYER_MAX_MANA,
    playerBarrierHits: 0,
    playerPosition,
    enemyPosition: getPlayerSpawn(arena),
    playerDirection: { ...DEFAULT_DIRECTION },
    bossDirection: { ...DEFAULT_DIRECTION },
    activeSkill: null,
    activeCastCategory: null,
    arena,
    worldSize,
    camera: { x: 0, y: 0 },
    mapId: levelConfig.mapId,
    minions: [],
    targetingReticle: null,
    pendingGroundSkillId: null,
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
    nextMinionId: 1,
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
  const map = getMapData(config.mapId);
  const worldSize = getMapWorldSize(map);
  const playerPosition = getPlayerSpawnForMap(map);
  const enemyPosition = getBossSpawnForMap(map);
  const minions = createMinionsFromLevel(level, config.mapId);
  const camera = updateCamera(playerPosition, arena, worldSize);

  return {
    ...createInitialState(arena),
    phase: "combat",
    level: config.id,
    bossMaxHp: config.bossMaxHp,
    enemyHP: config.bossMaxHp,
    mapId: config.mapId,
    worldSize,
    camera,
    playerPosition,
    enemyPosition,
    minions,
    nextMinionId: minions.length + 1,
    playerMana: PLAYER_MAX_MANA,
    bossAttackCooldown: config.bossFirstAttackDelayMs,
    combatLog: appendLog(
      [],
      `Level ${config.id}: ${config.title} — [Q] Assault  [E] Arcane`,
    ),
  };
}

export { appendLog };
