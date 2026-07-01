"use client";

import { useEffect, useRef } from "react";
import type { GameAction, GamePhase } from "@/lib/gameState";
import styles from "./SkillInput.module.scss";

type SkillInputProps = {
  phase: GamePhase;
  isSlowMotion: boolean;
  dispatch: (action: GameAction) => void;
};

export default function SkillInput({ phase, isSlowMotion, dispatch }: SkillInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "input") {
      inputRef.current?.focus();
    }
  }, [phase]);

  if (phase !== "input") return null;

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
        placeholder="Type skill: Slash, Fireball, Shield..."
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
