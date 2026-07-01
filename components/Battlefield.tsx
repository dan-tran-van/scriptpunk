import type { ReactNode } from "react";
import styles from "./Battlefield.module.scss";

type BattlefieldProps = {
  isSlowMotion: boolean;
  children: ReactNode;
};

export default function Battlefield({ isSlowMotion, children }: BattlefieldProps) {
  return (
    <div className={`${styles.battlefield} ${isSlowMotion ? styles.slowMotion : ""}`}>
      <div className={styles.grid} />
      <div className={styles.entities}>{children}</div>
      {isSlowMotion && <div className={styles.dimOverlay} />}
    </div>
  );
}
