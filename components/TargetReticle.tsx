import { RANGE_UNIT } from "@/lib/constants";
import { getSkillById } from "@/lib/playerSkills";
import type { Vec2 } from "@/lib/gameState";
import styles from "./TargetReticle.module.scss";

type TargetReticleProps = {
  position: Vec2;
  pendingSkillId: string;
};

export default function TargetReticle({ position, pendingSkillId }: TargetReticleProps) {
  const skill = getSkillById(pendingSkillId);
  const isAoe = skill?.pattern === "ground_aoe";
  const radius = skill?.aoeRadius ?? (skill ? skill.range * RANGE_UNIT : 50);

  return (
    <div
      className={styles.reticle}
      style={{ left: position.x, top: position.y }}
    >
      {isAoe && (
        <div
          className={styles.aoePreview}
          style={{
            width: radius * 2,
            height: radius * 2,
            marginLeft: -radius,
            marginTop: -radius,
          }}
        />
      )}
      <div className={styles.crosshair} />
    </div>
  );
}
