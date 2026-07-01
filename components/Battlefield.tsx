import type { CSSProperties, ReactNode } from "react";
import { SLOW_MOTION_TIME_SCALE } from "@/lib/constants";
import type { ArenaSize, Vec2 } from "@/lib/gameState";
import MapLayer from "./MapLayer";
import styles from "./Battlefield.module.scss";

type BattlefieldProps = {
  isSlowMotion: boolean;
  mapId: string;
  camera: Vec2;
  viewport: ArenaSize;
  worldSize: ArenaSize;
  children: ReactNode;
  onWorldPointerDown?: (e: React.PointerEvent) => void;
};

export default function Battlefield({
  isSlowMotion,
  mapId,
  camera,
  viewport,
  worldSize,
  children,
  onWorldPointerDown,
}: BattlefieldProps) {
  const timeScaleStyle = {
    "--combat-time-scale": isSlowMotion ? SLOW_MOTION_TIME_SCALE : 1,
  } as CSSProperties;

  return (
    <div
      className={`${styles.battlefield} ${isSlowMotion ? styles.slowMotion : ""}`}
      style={timeScaleStyle}
    >
      <div
        className={styles.worldScroll}
        style={{
          width: worldSize.width,
          height: worldSize.height,
          transform: `translate(${-camera.x}px, ${-camera.y}px)`,
        }}
        onPointerDown={onWorldPointerDown}
      >
        <MapLayer mapId={mapId} camera={camera} viewport={viewport} />
        <div className={styles.entities}>{children}</div>
      </div>
      {isSlowMotion && <div className={styles.dimOverlay} />}
    </div>
  );
}
