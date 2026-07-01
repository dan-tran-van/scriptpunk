"use client";

import { useEffect, useRef } from "react";
import { CAST_INPUT_TIMEOUT_MS } from "@/lib/constants";
import type { GameAction, GamePhase, SkillCategory } from "@/lib/gameState";
import { getSkillsForCategory } from "@/lib/playerSkills";
import styles from "./SkillInput.module.scss";

type SkillInputProps = {
  phase: GamePhase;
  activeCastCategory: SkillCategory | null;
  isSlowMotion: boolean;
  castInputRemainingMs: number;
  dispatch: (action: GameAction) => void;
};

export default function SkillInput({
  phase,
  activeCastCategory,
  isSlowMotion,
  castInputRemainingMs,
  dispatch,
}: SkillInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
    }
  }, [phase, activeCastCategory]);

  if (phase !== "input" || !activeCastCategory) return null;

  const skillNames = getSkillsForCategory(activeCastCategory)
    .map((s) => s.name)
    .join(", ");

  const secondsLeft = Math.ceil(castInputRemainingMs / 1000);
  const pct = (castInputRemainingMs / CAST_INPUT_TIMEOUT_MS) * 100;
  const urgent = castInputRemainingMs < 1500;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value ?? "";
    dispatch({ type: "SUBMIT_SKILL", input: value });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={styles.inputWrapper}>
      <div className={styles.timerRow}>
        <span className={`${styles.timerLabel} ${urgent ? styles.urgent : ""}`}>
          {secondsLeft}s
        </span>
        <div className={styles.timerTrack}>
          <div
            className={`${styles.timerFill} ${urgent ? styles.urgent : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <form
        className={`${styles.inputForm} ${isSlowMotion ? styles.highlighted : ""}`}
        onSubmit={handleSubmit}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={`Type: ${skillNames}`}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.submitButton}>
          Cast
        </button>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={() => dispatch({ type: "CANCEL_CAST" })}
        >
          Esc
        </button>
      </form>
    </div>
  );
}
