import type { LogisticsNode, NodeCategory } from "@/types/logistics";
import { CATEGORY_META, FLOW_MODE_META } from "@/utils/colorScale";

interface MapLegendProps {
  visibleNodes: LogisticsNode[];
}

export function MapLegend({ visibleNodes }: MapLegendProps) {
  const counts = visibleNodes.reduce<Record<NodeCategory, number>>(
    (accumulator, node) => {
      accumulator[node.category] += 1;
      return accumulator;
    },
    {
      port_sea: 0,
      port_river: 0,
      airport: 0,
      border: 0,
      freezone: 0,
      inland_hub: 0,
      corridor_anchor: 0,
    },
  );

  return (
    <div className="panel-shell pointer-events-auto max-w-[19rem] rounded-[24px] px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-soft)]">
        Leyenda operacional
      </div>
      <div className="mt-4 space-y-2">
        {(Object.entries(CATEGORY_META) as Array<[NodeCategory, (typeof CATEGORY_META)[NodeCategory]]>).map(
          ([category, meta]) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-sm text-[var(--text-main)]">{meta.label}</span>
              </div>
              <span className="font-['Rajdhani'] text-lg font-semibold text-[var(--text-strong)]">
                {counts[category]}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
          Estilo de corredores
        </div>
        <div className="mt-3 space-y-2">
          {(["land", "sea", "river"] as const).map((mode) => (
            <div key={mode} className="flex items-center gap-3">
              <span
                className="h-[2px] w-10 rounded-full"
                style={{
                  background:
                    mode === "land"
                      ? "linear-gradient(90deg, rgba(209,158,92,0.15), rgba(209,158,92,0.92))"
                      : mode === "sea"
                        ? "linear-gradient(90deg, rgba(96,138,224,0.15), rgba(96,138,224,0.92))"
                        : "linear-gradient(90deg, rgba(96,197,210,0.15), rgba(96,197,210,0.92))",
                }}
              />
              <span className="text-sm text-[var(--text-main)]">{FLOW_MODE_META[mode]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
