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
