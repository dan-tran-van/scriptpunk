import { BOSS_MELEE_RANGE } from "@/lib/constants";
import type { BossState, Vec2 } from "@/lib/gameState";
import styles from "./EnemyBoss.module.scss";

type EnemyBossProps = {
  position: Vec2;
  playerPosition: Vec2;
  bossState: BossState;
  hitFlash: boolean;
  isSlowMotion: boolean;
};

export default function EnemyBoss({
  position,
  playerPosition,
  bossState,
  hitFlash,
  isSlowMotion,
}: EnemyBossProps) {
  const isWindup = bossState === "windup";
  const isAttacking = bossState === "attacking";

  const dx = playerPosition.x - position.x;
  const dy = playerPosition.y - position.y;
  const lungeAngle = Math.atan2(dy, dx);

  const lungeX = Math.cos(lungeAngle) * 12;
  const lungeY = Math.sin(lungeAngle) * 12;

  return (
    <div
      className={`${styles.boss} ${hitFlash ? styles.hitFlash : ""} ${hitFlash ? styles.shake : ""} ${isSlowMotion ? styles.slowAnim : ""} ${isAttacking ? styles.striking : ""}`}
      style={{
        left: position.x,
        top: position.y,
        ...(isAttacking
          ? ({
              "--lunge-x": `${lungeX}px`,
              "--lunge-y": `${lungeY}px`,
            } as React.CSSProperties)
          : {}),
      }}
    >
      {isWindup && (
        <div
          className={styles.aoeCircle}
          style={{
            width: BOSS_MELEE_RANGE * 2,
            height: BOSS_MELEE_RANGE * 2,
          }}
        />
      )}
      {isAttacking && <div className={styles.shockwave} />}
      {isWindup && <div className={styles.windupRing} />}
      <div className={`${styles.sprite} ${isAttacking ? styles.strikeFlash : ""}`} />
    </div>
  );
}
