"use client";

import { useEffect, useRef } from "react";
import type { GameAction, GamePhase, SkillCategory } from "@/lib/gameState";
import { getSkillsForCategory } from "@/lib/playerSkills";
import styles from "./SkillInput.module.scss";

type SkillInputProps = {
  phase: GamePhase;
  activeCastCategory: SkillCategory | null;
  isSlowMotion: boolean;
  dispatch: (action: GameAction) => void;
};

export default function SkillInput({
  phase,
  activeCastCategory,
  isSlowMotion,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value ?? "";
    dispatch({ type: "SUBMIT_SKILL", input: value });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
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
  );
}
