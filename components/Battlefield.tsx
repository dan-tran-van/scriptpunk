import type { CSSProperties, ReactNode } from "react";
import { SLOW_MOTION_TIME_SCALE } from "@/lib/constants";
import styles from "./Battlefield.module.scss";

type BattlefieldProps = {
  isSlowMotion: boolean;
  children: ReactNode;
};

export default function Battlefield({ isSlowMotion, children }: BattlefieldProps) {
  const timeScaleStyle = {
    "--combat-time-scale": isSlowMotion ? SLOW_MOTION_TIME_SCALE : 1,
  } as CSSProperties;

  return (
    <div
      className={`${styles.battlefield} ${isSlowMotion ? styles.slowMotion : ""}`}
      style={timeScaleStyle}
    >
      <div className={styles.grid} />
      <div className={styles.entities}>{children}</div>
      {isSlowMotion && <div className={styles.dimOverlay} />}
    </div>
  );
}
