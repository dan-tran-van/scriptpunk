"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  gameReducer,
  getCategoryCooldown,
  getLaneSkillCooldown,
  getLevelConfig,
  isCategoryReady,
  MAX_LEVEL,
  type GameAction,
  type GameState,
} from "@/lib/gameEngine";
import type { SkillCategory } from "@/lib/gameState";
import { PLAYER_MAX_HP } from "@/lib/constants";
import Battlefield from "./Battlefield";
import Player from "./Player";
import EnemyBoss from "./EnemyBoss";
import Minion from "./Minion";
import TargetReticle from "./TargetReticle";
import SkillSystem from "./SkillSystem";
import SkillInput from "./SkillInput";
import CombatLog from "./CombatLog";
import styles from "./Game.module.scss";

const MOVEMENT_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

function getArenaSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function formatCategoryButton(
  label: string,
  key: string,
  category: SkillCategory,
  state: GameState,
): string {
  const cd = Math.max(
    getCategoryCooldown(state, category),
    getLaneSkillCooldown(state, category),
  );
  if (cd > 0) {
    return `${label} [${key}] ${Math.ceil(cd / 1000)}s`;
  }
  if (!isCategoryReady(state, category)) {
    return `${label} [${key}] —`;
  }
  return `${label} [${key}]`;
}

function tryBeginCast(
  keysRef: React.RefObject<Set<string>>,
  dispatch: (action: GameAction) => void,
  category: SkillCategory,
  state: GameState,
) {
  if (!isCategoryReady(state, category)) return;
  keysRef.current.clear();
  dispatch({ type: "PLAYER_MOVE", dx: 0, dy: 0 });
  dispatch({ type: "BEGIN_CAST", category });
}

export default function Game() {
  const [state, setState] = useState<GameState>(() =>
    createInitialState({ width: 800, height: 600 }),
  );
  const [selectedLevel, setSelectedLevel] = useState(1);
  const keysRef = useRef(new Set<string>());
  const phaseRef = useRef(state.phase);
  const stateRef = useRef(state);

  useEffect(() => {
    phaseRef.current = state.phase;
    stateRef.current = state;
  }, [state]);

  const dispatch = useCallback((action: GameAction) => {
    setState((s) => gameReducer(s, action));
  }, []);

  useEffect(() => {
    const resize = () => {
      const arena = getArenaSize();
      dispatch({ type: "RESIZE_ARENA", ...arena });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [dispatch]);

  useEffect(() => {
    let last = performance.now();
    let id: number;
    const loop = (now: number) => {
      const deltaMs = now - last;
      last = now;
      setState((s) => gameReducer(s, { type: "TICK", deltaMs }));
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  const updateMovement = useCallback(() => {
    const keys = keysRef.current;
    let dx = 0;
    let dy = 0;
    if (keys.has("w") || keys.has("arrowup")) dy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) dy += 1;
    if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
    if (keys.has("d") || keys.has("arrowright")) dx += 1;
    dispatch({ type: "PLAYER_MOVE", dx, dy });
  }, [dispatch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape" && phaseRef.current === "input") {
        dispatch({ type: "CANCEL_CAST" });
        return;
      }

      if (key === "escape" && phaseRef.current === "targeting") {
        dispatch({ type: "CANCEL_TARGET" });
        return;
      }

      if (key === "enter" && phaseRef.current === "targeting") {
        e.preventDefault();
        dispatch({ type: "CONFIRM_TARGET" });
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (phaseRef.current === "combat") {
        if (key === "q") {
          e.preventDefault();
          tryBeginCast(keysRef, dispatch, "assault", stateRef.current);
          return;
        }
        if (key === "e") {
          e.preventDefault();
          tryBeginCast(keysRef, dispatch, "arcane", stateRef.current);
          return;
        }
      }

      if (phaseRef.current === "combat" || phaseRef.current === "targeting") {
        if (MOVEMENT_KEYS.includes(key)) {
          e.preventDefault();
          keysRef.current.add(key);
          updateMovement();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (phaseRef.current !== "combat" && phaseRef.current !== "targeting") return;

      keysRef.current.delete(key);
      updateMovement();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dispatch, updateMovement]);

  const handleWorldPointerDown = useCallback(() => {
    // Pointer targeting stub — plug in reticleFromPointer later
  }, []);

  const playerHpPct = (state.playerHP / PLAYER_MAX_HP) * 100;
  const bossHpPct = (state.enemyHP / state.bossMaxHp) * 100;
  const levelConfig = getLevelConfig(state.phase === "idle" ? selectedLevel : state.level);
  const displayMana = Math.round(state.playerMana);
  const manaPct = Math.min(
    100,
    Math.max(0, (displayMana / state.playerMaxMana) * 100),
  );

  const hpColor = (pct: number) => {
    if (pct > 50) return styles.hpHigh;
    if (pct > 25) return styles.hpMid;
    return styles.hpLow;
  };

  const inCombat =
    state.phase === "combat" ||
    state.phase === "input" ||
    state.phase === "targeting";

  return (
    <div className={styles.gameRoot}>
      <div className={`${styles.worldLayer} ${state.isSlowMotion ? styles.slowMotion : ""}`}>
        <Battlefield
          isSlowMotion={state.isSlowMotion}
          mapId={state.mapId}
          camera={state.camera}
          viewport={state.arena}
          worldSize={state.worldSize}
          onWorldPointerDown={handleWorldPointerDown}
        >
          {inCombat && (
            <>
              <EnemyBoss
                position={state.enemyPosition}
                playerPosition={state.playerPosition}
                bossState={state.bossState}
                bossActiveSkill={state.bossActiveSkill}
                bossDirection={state.bossDirection}
                bossAoETarget={state.bossAoETarget}
                bossMeleeRange={levelConfig.bossMeleeRange}
                hitFlash={state.enemyHitFlash}
                isSlowMotion={state.isSlowMotion}
              />
              {state.minions.map((minion) => (
                <Minion
                  key={minion.id}
                  position={minion.position}
                  hp={minion.hp}
                  maxHp={minion.maxHp}
                />
              ))}
              {state.bossAoETarget && state.bossState === "windup" && state.bossActiveSkill === "pulse" && (
                <div
                  className={styles.pulseTelegraph}
                  style={{
                    left: state.bossAoETarget.x,
                    top: state.bossAoETarget.y,
                    width: levelConfig.bossMeleeRange * 2,
                    height: levelConfig.bossMeleeRange * 2,
                  }}
                />
              )}
              <Player
                position={state.playerPosition}
                direction={state.playerDirection}
                hitFlash={state.playerHitFlash}
                castingGlow={state.playerCastingGlow}
                barrierActive={state.playerBarrierHits > 0}
              />
              {state.phase === "targeting" &&
                state.targetingReticle &&
                state.pendingGroundSkillId && (
                  <TargetReticle
                    position={state.targetingReticle}
                    pendingSkillId={state.pendingGroundSkillId}
                  />
                )}
              <SkillSystem projectiles={state.activeProjectiles} />
            </>
          )}
        </Battlefield>
      </div>

      <div className={styles.hudLayer}>
        {inCombat && (
          <>
            <div className={styles.bossHud}>
              <span className={styles.levelHudLabel}>
                Level {state.level}: {levelConfig.title}
              </span>
              <span className={styles.bossName}>{levelConfig.bossName}</span>
              <div className={styles.hpBarTrack}>
                <div
                  className={`${styles.hpBarFill} ${hpColor(bossHpPct)}`}
                  style={{ width: `${bossHpPct}%` }}
                />
              </div>
              <span className={styles.hpText}>
                {state.enemyHP} / {state.bossMaxHp}
              </span>
            </div>

            <div className={styles.playerHud}>
              <span className={styles.hudLabel}>HP</span>
              <div className={styles.hpBarTrack}>
                <div
                  className={`${styles.hpBarFill} ${hpColor(playerHpPct)}`}
                  style={{ width: `${playerHpPct}%` }}
                />
              </div>
              <span className={styles.hpText}>
                {state.playerHP} / {PLAYER_MAX_HP}
              </span>
              <span className={styles.manaLabel}>MP</span>
              <div className={styles.manaBarTrack}>
                <div className={styles.manaBarFill} style={{ width: `${manaPct}%` }} />
              </div>
              <span className={styles.hpText}>
                {displayMana} / {state.playerMaxMana}
              </span>
            </div>

            <CombatLog entries={state.combatLog} />

            <div className={`${styles.actionStrip} ${styles.hudInteractive}`}>
              {state.phase === "combat" && (
                <div className={styles.castButtons}>
                  <button
                    type="button"
                    className={`${styles.castButtonAssault} ${!isCategoryReady(state, "assault") ? styles.disabled : ""}`}
                    disabled={!isCategoryReady(state, "assault")}
                    onClick={() => tryBeginCast(keysRef, dispatch, "assault", state)}
                  >
                    {formatCategoryButton("Assault", "Q", "assault", state)}
                  </button>
                  <button
                    type="button"
                    className={`${styles.castButtonArcane} ${!isCategoryReady(state, "arcane") ? styles.disabled : ""}`}
                    disabled={!isCategoryReady(state, "arcane")}
                    onClick={() => tryBeginCast(keysRef, dispatch, "arcane", state)}
                  >
                    {formatCategoryButton("Arcane", "E", "arcane", state)}
                  </button>
                </div>
              )}
              {state.phase === "targeting" && (
                <p className={styles.targetingHint}>
                  WASD aim · Enter confirm · Esc cancel
                </p>
              )}
              <SkillInput
                phase={state.phase}
                activeCastCategory={state.activeCastCategory}
                isSlowMotion={state.isSlowMotion}
                castInputRemainingMs={state.castInputRemainingMs}
                dispatch={dispatch}
              />
            </div>
          </>
        )}

        {state.phase === "idle" && (
          <div className={`${styles.overlay} ${styles.hudInteractive}`}>
            <div className={styles.overlayCard}>
              <h1 className={styles.title}>Scriptpunk</h1>
              <p className={styles.subtitle}>Language is your weapon.</p>
              <p className={styles.levelPickLabel}>
                Level {selectedLevel}: {getLevelConfig(selectedLevel).title}
              </p>
              <div className={styles.levelSelectRow}>
                {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.levelButton} ${selectedLevel === n ? styles.levelButtonActive : ""}`}
                    onClick={() => setSelectedLevel(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => dispatch({ type: "START_BATTLE", level: selectedLevel })}
              >
                Start Battle
              </button>
            </div>
          </div>
        )}

        {state.phase === "result" && (
          <div className={`${styles.overlay} ${styles.hudInteractive}`}>
            <div className={styles.overlayCard}>
              <h1 className={styles.title}>
                {state.result === "victory" ? "Victory!" : "Defeat"}
              </h1>
              <p className={styles.subtitle}>
                {state.result === "victory"
                  ? state.level >= MAX_LEVEL
                    ? "Campaign complete! The Void Titan is no more."
                    : `Level ${state.level} cleared. Ready for the next challenge?`
                  : `Level ${state.level} — try again.`}
              </p>
              <div className={styles.resultActions}>
                {state.result === "victory" && state.level < MAX_LEVEL && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => dispatch({ type: "NEXT_LEVEL" })}
                  >
                    Next Level
                  </button>
                )}
                {state.result === "defeat" && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => dispatch({ type: "RETRY_LEVEL" })}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => dispatch({ type: "RESTART" })}
                >
                  {state.result === "victory" && state.level >= MAX_LEVEL ? "Restart" : "Menu"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
