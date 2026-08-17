import { PhotoItem } from '@/types';

/** 通栏读数条空间有限，标签只取前几个 */
const MAX_TAGS = 4;

interface HeroReadoutProps {
  photo: PhotoItem | null;
  className?: string;
}

/** 读数字段：等宽标签紧邻取值，横向排列 */
function ReadoutField({
  label,
  value
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <span className="flex min-w-0 items-baseline gap-2.5">
      <span className="lab-mono shrink-0 text-lab-on-media-muted">{label}</span>
      <span className="truncate text-[13px] text-lab-on-media">{value}</span>
    </span>
  );
}

/**
 * 当前照片的地点与标签读数，供首屏底部通栏条使用。
 * 位于照片之上，故文字固定使用 on-media 令牌，不随主题翻转。
 */
export function HeroReadout({ photo, className }: HeroReadoutProps) {
  const tags = (photo?.photoAiAnalysis?.tags ?? []).slice(0, MAX_TAGS);
  const hasPlace = Boolean(photo?.location?.city || photo?.location?.district);

  if (!hasPlace && tags.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <ReadoutField label="City" value={photo?.location?.city} />
        <ReadoutField label="Area" value={photo?.location?.district} />

        {tags.length > 0 && (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="lab-mono mr-0.5 text-lab-on-media-muted">
              Tags
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="border border-lab-on-media/30 px-2 py-1 text-xs leading-none text-lab-on-media"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
