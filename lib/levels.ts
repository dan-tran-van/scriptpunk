export type LevelConfig = {
  id: number;
  title: string;
  bossName: string;
  bossMaxHp: number;
  bossDamageScale: number;
  bossAttackCooldownMs: number;
  bossDriftSpeed: number;
  bossMeleeRange: number;
  bossFirstAttackDelayMs: number;
  bossSkillIds: string[];
  mapId: string;
  minionSpawns: { x: number; y: number }[];
  minionHp: number;
  minionDamage: number;
  minionSpeed: number;
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: "Trial Grounds",
    bossName: "Void Titan",
    bossMaxHp: 200,
    bossDamageScale: 0.85,
    bossAttackCooldownMs: 3200,
    bossDriftSpeed: 0.06,
    bossMeleeRange: 84,
    bossFirstAttackDelayMs: 1200,
    bossSkillIds: ["slam", "void_bolt", "pulse"],
    mapId: "trial_grounds",
    minionSpawns: [
      { x: 400, y: 500 },
      { x: 1100, y: 700 },
    ],
    minionHp: 30,
    minionDamage: 8,
    minionSpeed: 0.1,
  },
  {
    id: 2,
    title: "Void Approach",
    bossName: "Void Titan",
    bossMaxHp: 240,
    bossDamageScale: 1.0,
    bossAttackCooldownMs: 2800,
    bossDriftSpeed: 0.07,
    bossMeleeRange: 90,
    bossFirstAttackDelayMs: 1000,
    bossSkillIds: ["slam", "void_bolt", "pulse", "ruin_beam", "rift_shard"],
    mapId: "void_approach",
    minionSpawns: [
      { x: 350, y: 450 },
      { x: 900, y: 600 },
      { x: 1400, y: 550 },
    ],
    minionHp: 40,
    minionDamage: 10,
    minionSpeed: 0.11,
  },
  {
    id: 3,
    title: "Titan's Throne",
    bossName: "Void Titan",
    bossMaxHp: 280,
    bossDamageScale: 1.1,
    bossAttackCooldownMs: 2500,
    bossDriftSpeed: 0.08,
    bossMeleeRange: 96,
    bossFirstAttackDelayMs: 900,
    bossSkillIds: ["slam", "void_bolt", "pulse", "ruin_beam", "rift_shard"],
    mapId: "titans_throne",
    minionSpawns: [
      { x: 400, y: 400 },
      { x: 800, y: 600 },
      { x: 1200, y: 500 },
      { x: 1600, y: 700 },
    ],
    minionHp: 50,
    minionDamage: 12,
    minionSpeed: 0.12,
  },
];

export const MAX_LEVEL = LEVELS.length;

export function clampLevel(level: number): number {
  if (level < 1) return 1;
  if (level > MAX_LEVEL) return MAX_LEVEL;
  return level;
}

export function getLevelConfig(level: number): LevelConfig {
  return LEVELS[clampLevel(level) - 1];
}
