import { startTransition } from "react";
import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { PERU_DEPARTMENTS } from "@/data/departments";
import type {
  DepartmentId,
  LogisticsNode,
  Macrozone,
  NodeCategory,
  StrategicLevel,
  Terrain,
} from "@/types/logistics";
import { useMapStore } from "@/store/useMapStore";
import {
  CATEGORY_META,
  MACROZONE_META,
  STRATEGIC_LEVEL_META,
  TERRAIN_META,
} from "@/utils/colorScale";

interface FiltersPanelProps {
  filteredCount: number;
  totalCount: number;
  departmentCounts: Record<DepartmentId, number>;
  searchMatches: LogisticsNode[];
  onFocusNode: (nodeId: string) => void;
  onFocusDepartment: (department: DepartmentId | null) => void;
}

function FilterChip({
  active,
  label,
  accent,
  onClick,
}: {
  active: boolean;
  label: string;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className="control-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold tracking-[0.08em]"
    >
      {accent ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
      ) : null}
      <span>{label}</span>
    </button>
  );
}

export function FiltersPanel({
  filteredCount,
  totalCount,
  departmentCounts,
  searchMatches,
  onFocusNode,
  onFocusDepartment,
}: FiltersPanelProps) {
  const filters = useMapStore((state) => state.filters);
  const selectedDepartment = useMapStore((state) => state.selectedDepartment);
  const setSearch = useMapStore((state) => state.setSearch);
  const toggleCategory = useMapStore((state) => state.toggleCategory);
  const toggleFilterValue = useMapStore((state) => state.toggleFilterValue);
  const resetFilters = useMapStore((state) => state.resetFilters);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    Boolean(selectedDepartment) ||
    filters.macrozones.length > 0 ||
    filters.strategicLevels.length > 0 ||
    filters.terrains.length > 0 ||
    Boolean(filters.search);

  const onSearchChange = (value: string) => {
    startTransition(() => {
      setSearch(value);
    });
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && searchMatches[0]) {
      onFocusNode(searchMatches[0].id);
    }
  };

  const onDepartmentChange = (department: DepartmentId | null) => {
    const next = selectedDepartment === department ? null : department;
    onFocusDepartment(next);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="panel-shell thin-scrollbar order-2 flex min-h-[18rem] flex-col overflow-hidden rounded-[28px] lg:order-1 lg:min-h-0"
    >
      <div className="border-b border-[var(--surface-border)] px-4 py-4 lg:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
              Exploración
            </div>
            <h2 className="mt-2 font-['Rajdhani'] text-xl font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
              Filtros y búsqueda
            </h2>
          </div>
          <div className="rounded-full border border-[var(--surface-border)] bg-black/20 px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Cobertura
            </div>
            <div className="mt-1 font-['Rajdhani'] text-lg font-semibold tracking-[0.08em] text-[var(--text-strong)]">
              {filteredCount}/{totalCount}
            </div>
          </div>
        </div>
      </div>

      <div className="thin-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-4 lg:px-5">
        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            Buscar nodo
          </div>
          <div className="rounded-[22px] border border-[var(--surface-border)] bg-black/20 p-2">
            <input
              type="text"
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Callao, Chancay, ZOFRATACNA..."
              className="w-full bg-transparent px-3 py-2 text-sm text-[var(--text-strong)] outline-none placeholder:text-[var(--text-soft)]"
            />
          </div>

          {searchMatches.length > 0 ? (
            <div className="space-y-2">
              {searchMatches.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onFocusNode(node.id)}
                  className="flex w-full items-center justify-between rounded-[18px] border border-[var(--surface-border)] bg-black/15 px-3 py-2 text-left transition hover:border-[var(--surface-border-strong)] hover:bg-black/25"
                >
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-strong)]">{node.name}</div>
                    <div className="text-xs text-[var(--text-soft)]">{node.region}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                    Focus
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            Departamento (24)
          </div>
          <div className="thin-scrollbar max-h-52 overflow-y-auto pr-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-active={!selectedDepartment}
                onClick={() => onDepartmentChange(null)}
                className="control-pill rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                Todo Perú
              </button>

              {PERU_DEPARTMENTS.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  data-active={selectedDepartment === department.id}
                  onClick={() => onDepartmentChange(department.id)}
                  className="control-pill inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold tracking-[0.08em]"
                >
                  <span>{department.label}</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-[var(--text-soft)]">
                    {departmentCounts[department.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-5 text-[var(--text-soft)]">
            Al elegir un departamento, la cámara entra al área y se priorizan etiquetas de puertos para reducir ruido visual.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Tipo de nodo
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  onFocusDepartment(null);
                }}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)] transition hover:text-[var(--text-strong)]"
              >
                Limpiar
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORY_META) as Array<[NodeCategory, (typeof CATEGORY_META)[NodeCategory]]>).map(
              ([category, meta]) => (
                <FilterChip
                  key={category}
                  active={filters.categories.includes(category)}
                  label={meta.label}
                  accent={meta.color}
                  onClick={() => toggleCategory(category)}
                />
              ),
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            Macrozona
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(MACROZONE_META) as Array<[Macrozone, string]>).map(([macrozone, label]) => (
              <FilterChip
                key={macrozone}
                active={filters.macrozones.includes(macrozone)}
                label={label}
                onClick={() => toggleFilterValue("macrozones", macrozone)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            Nivel estratégico
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(STRATEGIC_LEVEL_META) as Array<[StrategicLevel, string]>).map(
              ([level, label]) => (
                <FilterChip
                  key={level}
                  active={filters.strategicLevels.includes(level)}
                  label={label}
                  onClick={() => toggleFilterValue("strategicLevels", level)}
                />
              ),
            )}
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            Terreno
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(TERRAIN_META) as Array<[Terrain, string]>).map(([terrain, label]) => (
              <FilterChip
                key={terrain}
                active={filters.terrains.includes(terrain)}
                label={label}
                onClick={() => toggleFilterValue("terrains", terrain)}
              />
            ))}
          </div>
        </section>
      </div>
    </motion.aside>
  );
}
