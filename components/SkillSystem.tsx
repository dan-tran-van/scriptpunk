import type { Projectile } from "@/lib/gameState";
import styles from "./SkillSystem.module.scss";

type SkillSystemProps = {
  projectiles: Projectile[];
};

function BeamEffect({ p }: { p: Projectile }) {
  const length = Math.hypot(p.targetX - p.originX, p.targetY - p.originY);
  const angle = Math.atan2(p.targetY - p.originY, p.targetX - p.originX);

  return (
    <div
      className={`${styles.effect} ${styles.beamWrapper}`}
      style={{
        left: p.originX,
        top: p.originY,
      }}
    >
      <div
        className={styles.beam}
        style={{
          width: length * p.progress,
          transform: `rotate(${angle}rad)`,
        }}
      />
    </div>
  );
}

export default function SkillSystem({ projectiles }: SkillSystemProps) {
  return (
    <>
      {projectiles.map((p) => {
        if (p.animation === "beam") {
          return <BeamEffect key={p.id} p={p} />;
        }

        return (
          <div
            key={p.id}
            className={`${styles.effect} ${styles[p.animation]}`}
            style={{
              left: p.x,
              top: p.y,
            }}
          >
            {p.animation === "projectile" && <div className={styles.projectileCore} />}
            {p.animation === "burst" && (
              <div
                className={styles.burstCore}
                style={{ transform: `scale(${0.2 + p.progress * 1.8})` }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
