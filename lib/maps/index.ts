import {
  createEmptyMap,
  scatterDecorations,
  type MapData,
} from "../map";

const MAPS: Record<string, MapData> = {};

function buildMap(id: string, width: number, height: number, seed: number): MapData {
  const map = createEmptyMap(id, width, height);
  const rockCount = Math.floor((width * height) / 80);
  const treeCount = Math.floor((width * height) / 120);
  scatterDecorations(map, rockCount, "rock", seed);
  scatterDecorations(map, treeCount, "tree", seed + 17);
  if (id !== "trial_grounds") {
    scatterDecorations(map, id === "void_approach" ? 2 : 4, "house", seed + 31);
  }
  return map;
}

MAPS.trial_grounds = buildMap("trial_grounds", 48, 36, 101);
MAPS.void_approach = buildMap("void_approach", 56, 40, 202);
MAPS.titans_throne = buildMap("titans_throne", 64, 44, 303);

export function getMapData(mapId: string): MapData {
  return MAPS[mapId] ?? MAPS.trial_grounds;
}
