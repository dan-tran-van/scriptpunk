import type { Vec2 } from "@/lib/gameState";
import styles from "./Player.module.scss";

type PlayerProps = {
  position: Vec2;
  hitFlash: boolean;
  castingGlow: boolean;
};

export default function Player({ position, hitFlash, castingGlow }: PlayerProps) {
  return (
    <div
      className={`${styles.player} ${hitFlash ? styles.hitFlash : ""} ${castingGlow ? styles.castingGlow : ""}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={styles.sprite} />
    </div>
  );
}
