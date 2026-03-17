import { useState } from "react";
import type { LogisticsNode, NodeCategory } from "@/types/logistics";
import { CATEGORY_META, FLOW_MODE_META } from "@/utils/colorScale";

interface MapLegendProps {
  visibleNodes: LogisticsNode[];
  activeCategories: NodeCategory[];
  onToggleCategory: (category: NodeCategory) => void;
  onClearCategories: () => void;
}

export function MapLegend({
  visibleNodes,
  activeCategories,
  onToggleCategory,
  onClearCategories,
}: MapLegendProps) {
  const [minimized, setMinimized] = useState(false);
  const hasCategoryFilter = activeCategories.length > 0;
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
      <div className="flex items-center justify-between gap-3">
        <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.26em] text-[var(--text-soft)]">
          Leyenda operacional
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMinimized((state) => !state)}
            className="control-pill rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            {minimized ? "Expandir" : "Minimizar"}
          </button>
          <button
            type="button"
            onClick={onClearCategories}
            disabled={activeCategories.length === 0}
            className="control-pill rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Limpiar
          </button>
        </div>
      </div>
      {minimized ? (
        <div className="mt-3 rounded-xl border border-[var(--surface-border)] bg-black/15 px-3 py-2 text-xs text-[var(--text-soft)]">
          {visibleNodes.length} nodos visibles
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {(Object.entries(CATEGORY_META) as Array<[NodeCategory, (typeof CATEGORY_META)[NodeCategory]]>).map(
              ([category, meta]) => {
                const active = !hasCategoryFilter || activeCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onToggleCategory(category)}
                    data-active={active}
                    className="control-pill flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-sm text-[var(--text-main)]">{meta.label}</span>
                    </div>
                    <span className="font-['Rajdhani'] text-lg font-semibold text-[var(--text-strong)]">
                      {counts[category]}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-4 border-t border-[var(--surface-border)] pt-4">
            <p className="mb-2 text-[11px] text-[var(--text-soft)]">
              Sin seleccion activa: todas las categorias visibles.
            </p>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Estilo de corredores
            </div>
            <div className="mt-3 space-y-2">
              {(["land", "sea", "river", "air"] as const).map((mode) => (
                <div key={mode} className="flex items-center gap-3">
                  <span
                    className="h-[2px] w-10 rounded-full"
                    style={{
                      background:
                        mode === "land"
                          ? "linear-gradient(90deg, rgba(209,158,92,0.15), rgba(209,158,92,0.92))"
                          : mode === "sea"
                            ? "linear-gradient(90deg, rgba(96,138,224,0.15), rgba(96,138,224,0.92))"
                            : mode === "river"
                              ? "linear-gradient(90deg, rgba(96,197,210,0.15), rgba(96,197,210,0.92))"
                              : "linear-gradient(90deg, rgba(168,126,214,0.15), rgba(168,126,214,0.92))",
                    }}
                  />
                  <span className="text-sm text-[var(--text-main)]">{FLOW_MODE_META[mode]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
