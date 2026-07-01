import type { Direction, Vec2 } from "@/lib/gameState";
import styles from "./Player.module.scss";

type PlayerProps = {
  position: Vec2;
  direction: Direction;
  hitFlash: boolean;
  castingGlow: boolean;
  barrierActive: boolean;
};

export default function Player({
  position,
  direction,
  hitFlash,
  castingGlow,
  barrierActive,
}: PlayerProps) {
  const angle = Math.atan2(direction.y, direction.x);

  return (
    <div
      className={`${styles.player} ${hitFlash ? styles.hitFlash : ""} ${castingGlow ? styles.castingGlow : ""} ${barrierActive ? styles.barrier : ""}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div
        className={styles.facingArrow}
        style={{ transform: `rotate(${angle}rad)` }}
      />
      <div className={styles.sprite} />
    </div>
  );
}
