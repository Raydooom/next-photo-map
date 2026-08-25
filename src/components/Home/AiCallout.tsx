"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Eyebrow, LabButton, Reveal } from "@/components/ui";
import { PhotoItem } from "@/types";
import { PhotoTicker } from "./PhotoTicker";

/** 提示的停留时长（毫秒），够读完一句话 */
const NOTICE_DURATION = 2800;

interface AiCalloutProps {
  /** 作为背景滚动的照片，纯装饰 */
  photos?: PhotoItem[];
}

/**
 * AI 检索入口。
 * 不设描边与底色，区块的存在感交给纵向滚动的照片背景；
 * 强调色只留在 eyebrow 与主按钮上作点缀。
 */
export function AiCallout({ photos = [] }: AiCalloutProps) {
  const [shortcut, setShortcut] = useState("⌘K");
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const noticeTimer = useRef<number | undefined>(undefined);

  /**
   * 功能尚未开放，按钮与快捷键都只给一句提示。
   *
   * 没有做成禁用态：按钮一灰下去，观者只会以为自己没资格用，
   * 不知道是"还没做好"。留着可点、点了告诉他进展，信息更准。
   *
   * 重复触发时重新计时，而不是排队 —— 连按几下只该看到同一句话多停一会儿。
   */
  const announceSoon = useCallback(() => {
    setIsNoticeOpen(true);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(
      () => setIsNoticeOpen(false),
      NOTICE_DURATION,
    );
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    const isMac = navigator.userAgent.toLowerCase().includes("mac");
    setShortcut(isMac ? "⌘K" : "Ctrl+K");

    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = isMac ? event.metaKey : event.ctrlKey;
      if (withModifier && event.key === "k") {
        event.preventDefault();
        announceSoon();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [announceSoon]);

  return (
    // 上方留白刻意大于常规章节间距，与足迹地图区块拉开距离
    <section className="lab-shell pb-[var(--lab-section-gap)] pt-10 md:pt-20">
      <Reveal>
        {/* 上下留出更大面积，让背景照片墙铺得开 */}
        <div className="relative overflow-hidden px-6 py-20 md:px-10 md:py-32">
          <PhotoTicker photos={photos} />

          {/* relative 使内容压在滚动背景之上 */}
          <div className="lab-grid relative items-end gap-y-8">
            <div className="col-span-full md:col-span-7">
              <Eyebrow className="flex items-center gap-2 text-lab-accent">
                <Sparkles className="h-3.5 w-3.5" />
                AI search
                {/* 常驻标注：点之前就该知道这块还没通，不必先点一次才发现 */}
                <span className="border border-lab-line px-1.5 py-0.5 text-lab-faint">
                  开发中
                </span>
              </Eyebrow>

              <h2 className="lab-title mt-5 text-lab-paper">
                Ask the archive.
              </h2>
              <p className="lab-body mt-4 max-w-[42ch] text-lab-muted">
                用自然语言检索这些照片：按地点、时间、拍摄参数，或者直接描述画面内容。
              </p>
            </div>

            <div className="col-span-full md:col-span-4 md:col-start-9 md:justify-self-end">
              <div className="flex items-center gap-4">
                <LabButton
                  variant="primary"
                  onClick={announceSoon}
                  endContent={<ArrowUpRight className="h-3.5 w-3.5" />}
                >
                  开始提问
                </LabButton>
                <kbd className="lab-mono hidden border border-lab-line-strong px-2.5 py-1.5 text-lab-muted sm:block">
                  {shortcut}
                </kbd>
              </div>

              {/**
               * 点击后的即时反馈。
               *
               * 高度留在原处（grid 占位），提示进出时按钮不会被顶动 ——
               * 否则每次点击整块都要跳一下。
               * aria-live 让读屏也能听到，不然这条提示对它是不存在的。
               */}
              <div className="mt-3 grid min-h-5">
                <AnimatePresence>
                  {isNoticeOpen && (
                    <motion.p
                      role="status"
                      aria-live="polite"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="lab-mono normal-case tracking-normal text-lab-muted"
                    >
                      检索还在搭，先看照片墙吧
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
