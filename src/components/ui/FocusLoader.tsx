"use client";

import { motion, useReducedMotion } from "motion/react";
import clsx from "clsx";

/** 取景框边长 */
const FRAME = 76;

/** 四角 L 形的边长 */
const CORNER = 15;

/**
 * 四个角各取两条边，拼成取景框的四只角。
 * 只画角不画整框 —— 相机取景器就是这么标示对焦区域的，
 * 四条边围满反而成了一个普通方框。
 */
const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "left-0 bottom-0 border-l-2 border-b-2",
  "right-0 bottom-0 border-r-2 border-b-2",
];

/**
 * 载入指示：相机的对焦动作。
 *
 * 不用转圈：这一页从头到尾是摄影的语境，而"取景框收拢 — 合焦 — 松开"
 * 恰好也是一次等待的形状，比一个通用的 spinner 更说得通，
 * 四角的 L 形线条也正是这套视觉里的直角语言。
 *
 * 三层各管一件事：外框收放交代"正在对"，中心准星的脉动交代"还在动"，
 * 底下一行 mono 交代"这是载入"。缺了准星，框在收放的间歇会显得停住了。
 */
export function FocusLoader({ label = "Focusing" }: { label?: string } = {}) {
  const shouldReduce = useReducedMotion();

  /** 收拢到 0.82 再松开，停在两端各留一拍，像对焦来回试探 */
  const frameAnimation = shouldReduce
    ? {}
    : {
        animate: { scale: [1, 0.82, 0.82, 1] },
        transition: {
          duration: 1.8,
          times: [0, 0.35, 0.62, 1],
          ease: "easeInOut" as const,
          repeat: Infinity,
        },
      };

  const reticleAnimation = shouldReduce
    ? {}
    : {
        animate: { opacity: [0.25, 1, 0.25] },
        transition: {
          duration: 1.8,
          ease: "easeInOut" as const,
          repeat: Infinity,
        },
      };

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        aria-hidden
        className="relative"
        style={{ width: FRAME, height: FRAME }}
        {...frameAnimation}
      >
        {CORNERS.map((corner) => (
          <span
            key={corner}
            className={clsx(
              "absolute border-lab-muted dark:border-lab-on-media-muted",
              corner,
            )}
            style={{ width: CORNER, height: CORNER }}
          />
        ))}

        {/* 中心准星：一横一竖交叉，用强调色，与四角的中性线分出主次 */}
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          {...reticleAnimation}
        >
          <span className="absolute left-1/2 top-1/2 block h-[2px] w-[14px] -translate-x-1/2 -translate-y-1/2 bg-lab-accent" />
          <span className="absolute left-1/2 top-1/2 block h-[14px] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-lab-accent" />
        </motion.span>
      </motion.div>

      <p
        className="lab-mono text-lab-faint dark:text-lab-on-media-muted/70"
        role="status"
      >
        {label}
      </p>
    </div>
  );
}
