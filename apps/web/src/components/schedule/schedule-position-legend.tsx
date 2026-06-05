import { POSITION_CARD_STYLES } from "@/components/schedule/position-styles";
import type { Position } from "@/lib/timeclock-types";

export function SchedulePositionLegend() {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2.5 sm:px-5">
      {(Object.keys(POSITION_CARD_STYLES) as Position[]).map((position) => (
        <span
          key={position}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          <span className={`size-2 rounded-full ${POSITION_CARD_STYLES[position].dot}`} />
          {position}
        </span>
      ))}
    </div>
  );
}
