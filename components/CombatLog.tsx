import styles from "./CombatLog.module.scss";

type CombatLogProps = {
  entries: string[];
};

export default function CombatLog({ entries }: CombatLogProps) {
  return (
    <div className={styles.log}>
      <div className={styles.logHeader}>Combat Log</div>
      <ul className={styles.logList}>
        {entries.map((entry, i) => (
          <li key={`${i}-${entry}`} className={styles.logEntry}>
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
