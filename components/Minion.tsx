import type { Vec2 } from "@/lib/gameState";
import styles from "./Minion.module.scss";

type MinionProps = {
  position: Vec2;
  hp: number;
  maxHp: number;
};

export default function Minion({ position, hp, maxHp }: MinionProps) {
  const hpPct = (hp / maxHp) * 100;

  return (
    <div
      className={styles.minion}
      style={{ left: position.x, top: position.y }}
    >
      <div className={styles.sprite} />
      <div className={styles.hpBar}>
        <div className={styles.hpFill} style={{ width: `${hpPct}%` }} />
      </div>
    </div>
  );
}
