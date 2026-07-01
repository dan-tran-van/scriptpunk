import { getMapData } from "@/lib/maps";
import { TILE_SIZE, type TileType } from "@/lib/map";
import type { ArenaSize, Vec2 } from "@/lib/gameState";
import styles from "./MapLayer.module.scss";

type MapLayerProps = {
  mapId: string;
  camera: Vec2;
  viewport: ArenaSize;
};

const TILE_CLASS: Record<TileType, string> = {
  floor: styles.floor,
  rock: styles.rock,
  tree: styles.tree,
  house: styles.house,
};

export default function MapLayer({ mapId, camera, viewport }: MapLayerProps) {
  const map = getMapData(mapId);
  const margin = 1;
  const startTx = Math.max(0, Math.floor(camera.x / TILE_SIZE) - margin);
  const startTy = Math.max(0, Math.floor(camera.y / TILE_SIZE) - margin);
  const endTx = Math.min(
    map.width - 1,
    Math.ceil((camera.x + viewport.width) / TILE_SIZE) + margin,
  );
  const endTy = Math.min(
    map.height - 1,
    Math.ceil((camera.y + viewport.height) / TILE_SIZE) + margin,
  );

  const tiles = [];
  for (let ty = startTy; ty <= endTy; ty++) {
    for (let tx = startTx; tx <= endTx; tx++) {
      const type = map.tiles[ty * map.width + tx] ?? "floor";
      tiles.push(
        <div
          key={`${tx}-${ty}`}
          className={`${styles.tile} ${TILE_CLASS[type]}`}
          style={{
            left: tx * TILE_SIZE,
            top: ty * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
          }}
        />,
      );
    }
  }

  return <div className={styles.mapLayer}>{tiles}</div>;
}
