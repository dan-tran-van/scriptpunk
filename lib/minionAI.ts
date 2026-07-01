import { PLAYER_HITBOX } from "./constants";
import { getMapData } from "./maps";
import { getMapWorldSize, resolveMovement } from "./map";
import { distance, normalizeInput } from "./geometry";
import { appendLog, type GameState } from "./gameState";

const MINION_MELEE_RANGE = 40;
const MINION_HITBOX = 14;

export function tickMinions(state: GameState, deltaMs: number): GameState {
  if (state.phase !== "combat" && state.phase !== "input" && state.phase !== "targeting") {
    return state;
  }
  if (state.minions.length === 0) return state;

  const map = getMapData(state.mapId);
  const world = getMapWorldSize(map);
  let next = state;
  const surviving = [];

  for (const minion of state.minions) {
    if (minion.hp <= 0) continue;

    const dist = distance(minion.position, state.playerPosition);
    let attackRemaining = Math.max(0, minion.attackRemaining - deltaMs);
    let position = minion.position;

    if (dist <= MINION_MELEE_RANGE + PLAYER_HITBOX) {
      if (attackRemaining <= 0) {
        next = applyMinionMelee(next, minion.damage);
        attackRemaining = minion.attackCooldownMs;
      }
    } else {
      const dir = normalizeInput(
        state.playerPosition.x - minion.position.x,
        state.playerPosition.y - minion.position.y,
      );
      const step = minion.speed * deltaMs;
      position = resolveMovement(
        map,
        minion.position,
        {
          x: minion.position.x + dir.x * step,
          y: minion.position.y + dir.y * step,
        },
        MINION_HITBOX,
        world,
      );
    }

    surviving.push({
      ...minion,
      position,
      attackRemaining,
    });
  }

  return { ...next, minions: surviving };
}

function applyMinionMelee(state: GameState, damage: number): GameState {
  if (state.playerBarrierHits > 0) {
    return {
      ...state,
      playerBarrierHits: state.playerBarrierHits - 1,
      playerHitFlash: true,
      playerHitFlashMs: 200,
      combatLog: appendLog(state.combatLog, "Barrier blocked a minion!"),
    };
  }

  return {
    ...state,
    playerHP: Math.max(0, state.playerHP - damage),
    playerHitFlash: true,
    playerHitFlashMs: 200,
    combatLog: appendLog(state.combatLog, `Minion hits you for ${damage}!`),
  };
}

export function applyMinionDamage(
  state: GameState,
  minionId: string,
  damage: number,
  skillName: string,
): GameState {
  const minion = state.minions.find((m) => m.id === minionId);
  if (!minion) return state;

  const hp = Math.max(0, minion.hp - damage);
  if (hp <= 0) {
    return {
      ...state,
      minions: state.minions.filter((m) => m.id !== minionId),
      combatLog: appendLog(state.combatLog, `${skillName} slays a minion!`),
    };
  }

  return {
    ...state,
    minions: state.minions.map((m) => (m.id === minionId ? { ...m, hp } : m)),
    combatLog: appendLog(state.combatLog, `${skillName} hits minion for ${damage}!`),
  };
}
