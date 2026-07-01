"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  gameReducer,
  type GameAction,
  type GameState,
} from "@/lib/gameEngine";
import type { SkillCategory } from "@/lib/gameState";
import { BOSS_MAX_HP, BOSS_NAME, PLAYER_MAX_HP } from "@/lib/constants";
import Battlefield from "./Battlefield";
import Player from "./Player";
import EnemyBoss from "./EnemyBoss";
import SkillSystem from "./SkillSystem";
import SkillInput from "./SkillInput";
import CombatLog from "./CombatLog";
import styles from "./Game.module.scss";

const MOVEMENT_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

function getArenaSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function beginCast(
  keysRef: React.RefObject<Set<string>>,
  dispatch: (action: GameAction) => void,
  category: SkillCategory,
) {
  keysRef.current.clear();
  dispatch({ type: "PLAYER_MOVE", dx: 0, dy: 0 });
  dispatch({ type: "BEGIN_CAST", category });
}

export default function Game() {
  const [state, setState] = useState<GameState>(() =>
    createInitialState({ width: 800, height: 600 }),
  );
  const keysRef = useRef(new Set<string>());
  const phaseRef = useRef(state.phase);

  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

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

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (phaseRef.current === "combat") {
        if (key === "q") {
          e.preventDefault();
          beginCast(keysRef, dispatch, "assault");
          return;
        }
        if (key === "e") {
          e.preventDefault();
          beginCast(keysRef, dispatch, "arcane");
          return;
        }
      }

      if (phaseRef.current !== "combat") return;

      if (MOVEMENT_KEYS.includes(key)) {
        e.preventDefault();
        keysRef.current.add(key);
        updateMovement();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (phaseRef.current !== "combat") return;

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

  const playerHpPct = (state.playerHP / PLAYER_MAX_HP) * 100;
  const bossHpPct = (state.enemyHP / BOSS_MAX_HP) * 100;
  const manaPct = (state.playerMana / state.playerMaxMana) * 100;

  const hpColor = (pct: number) => {
    if (pct > 50) return styles.hpHigh;
    if (pct > 25) return styles.hpMid;
    return styles.hpLow;
  };

  const inCombat = state.phase === "combat" || state.phase === "input";

  return (
    <div className={styles.gameRoot}>
      <div className={`${styles.worldLayer} ${state.isSlowMotion ? styles.slowMotion : ""}`}>
        <Battlefield isSlowMotion={state.isSlowMotion}>
          {inCombat && (
            <>
              <EnemyBoss
                position={state.enemyPosition}
                playerPosition={state.playerPosition}
                bossState={state.bossState}
                bossActiveSkill={state.bossActiveSkill}
                bossDirection={state.bossDirection}
                bossAoETarget={state.bossAoETarget}
                hitFlash={state.enemyHitFlash}
                isSlowMotion={state.isSlowMotion}
              />
              {state.bossAoETarget && state.bossState === "windup" && state.bossActiveSkill === "pulse" && (
                <div
                  className={styles.pulseTelegraph}
                  style={{
                    left: state.bossAoETarget.x,
                    top: state.bossAoETarget.y,
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
              <SkillSystem projectiles={state.activeProjectiles} />
            </>
          )}
        </Battlefield>
      </div>

      <div className={styles.hudLayer}>
        {inCombat && (
          <>
            <div className={styles.bossHud}>
              <span className={styles.bossName}>{BOSS_NAME}</span>
              <div className={styles.hpBarTrack}>
                <div
                  className={`${styles.hpBarFill} ${hpColor(bossHpPct)}`}
                  style={{ width: `${bossHpPct}%` }}
                />
              </div>
              <span className={styles.hpText}>
                {state.enemyHP} / {BOSS_MAX_HP}
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
                {Math.floor(state.playerMana)} / {state.playerMaxMana}
              </span>
            </div>

            <CombatLog entries={state.combatLog} />

            <div className={`${styles.actionStrip} ${styles.hudInteractive}`}>
              {state.phase === "combat" && (
                <div className={styles.castButtons}>
                  <button
                    type="button"
                    className={styles.castButtonAssault}
                    onClick={() => beginCast(keysRef, dispatch, "assault")}
                  >
                    Assault [Q]
                  </button>
                  <button
                    type="button"
                    className={styles.castButtonArcane}
                    onClick={() => beginCast(keysRef, dispatch, "arcane")}
                  >
                    Arcane [E]
                  </button>
                </div>
              )}
              <SkillInput
                phase={state.phase}
                activeCastCategory={state.activeCastCategory}
                isSlowMotion={state.isSlowMotion}
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
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => dispatch({ type: "START_BATTLE" })}
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
                  ? "The Void Titan has fallen."
                  : "The battlefield claims another soul."}
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => dispatch({ type: "RESTART" })}
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
