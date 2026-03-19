import { useMemo, useState } from "react";
import type { LogisticsNode, NodeCategory } from "@/types/logistics";
import { CATEGORY_META, FLOW_MODE_META } from "@/utils/colorScale";

interface MapLegendProps {
  visibleNodes: LogisticsNode[];
  availableCategories: NodeCategory[];
  categoryTotals: Record<NodeCategory, number>;
  activeCategories: NodeCategory[];
  onToggleCategory: (category: NodeCategory) => void;
  onClearCategories: () => void;
}

export function MapLegend({
  visibleNodes,
  availableCategories,
  categoryTotals,
  activeCategories,
  onToggleCategory,
  onClearCategories,
}: MapLegendProps) {
  const [minimized, setMinimized] = useState(false);
  const hasCategoryFilter = activeCategories.length > 0;
  const visibleCounts = useMemo(
    () =>
      visibleNodes.reduce<Record<NodeCategory, number>>(
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
      ),
    [visibleNodes],
  );

  const categoriesToRender = useMemo(
    () =>
      availableCategories.filter(
        (category) => categoryTotals[category] > 0 || activeCategories.includes(category),
      ),
    [activeCategories, availableCategories, categoryTotals],
  );

  return (
    <div className="panel-shell pointer-events-auto max-w-[11.5rem] rounded-[18px] px-2.5 py-2.5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div className="font-['Rajdhani'] text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
          Leyenda operativa
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized((state) => !state)}
            className="control-pill rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
            title={minimized ? "Expandir leyenda" : "Minimizar leyenda"}
            aria-label={minimized ? "Expandir leyenda" : "Minimizar leyenda"}
          >
            {minimized ? "+" : "_"}
          </button>
          <button
            type="button"
            onClick={onClearCategories}
            disabled={activeCategories.length === 0}
            className="control-pill rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Limpiar
          </button>
        </div>
      </div>

      {minimized ? (
        <div className="mt-2 rounded-lg border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-2 py-1.5 text-[10px] text-[var(--text-soft)]">
          {visibleNodes.length} nodos visibles
        </div>
      ) : (
        <>
          <div className="mt-2.5 space-y-1.5">
            {categoriesToRender.map((category) => {
              const meta = CATEGORY_META[category];
              const active = !hasCategoryFilter || activeCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onToggleCategory(category)}
                  data-active={active}
                  className="control-pill flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="text-[11px] leading-4 text-[var(--text-main)]">
                      {meta.label}
                    </span>
                  </div>
                  <span className="font-['Rajdhani'] text-sm font-semibold text-[var(--text-strong)]">
                    {visibleCounts[category]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 border-t border-[var(--surface-border)] pt-2.5">
            <p className="mb-1.5 text-[9px] leading-4 text-[var(--text-soft)]">
              Sin seleccion activa se muestran todas las categorias disponibles.
            </p>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Tipos de corredor
            </div>
            <div className="mt-2 space-y-1.5">
              {(["land", "sea", "river", "air"] as const).map((mode) => (
                <div key={mode} className="flex items-center gap-3">
                  <span
                    className="h-[2px] w-6 rounded-full"
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
                  <span className="text-[10px] leading-4 text-[var(--text-main)]">
                    {FLOW_MODE_META[mode]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
