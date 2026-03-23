import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { MapThemeDepth, MapViewMode, PresentationState } from "@/types/logistics";

interface TopBarProps {
  visibleNodeCount: number;
  visibleFlowCount: number;
  viewMode: MapViewMode;
  themeDepth: MapThemeDepth;
  showLabels: boolean;
  showFlows: boolean;
  showCorridors: boolean;
  showFleetHeatmapControl: boolean;
  showFleetHeatmap: boolean;
  exportPending: boolean;
  presentation: PresentationState;
  onViewModeChange: (mode: MapViewMode) => void;
  onToggleThemeDepth: () => void;
  onToggleLabels: () => void;
  onToggleFlows: () => void;
  onToggleCorridors: () => void;
  onToggleFleetHeatmap: () => void;
  onResetCamera: () => void;
  onExport: () => void;
  onStartPresentation: () => void;
  onPausePresentation: () => void;
  onResumePresentation: () => void;
  onStopPresentation: () => void;
}

const viewModes: Array<{ id: MapViewMode; label: string }> = [
  { id: "standard", label: "2D" },
  { id: "emphasis3d", label: "Enfasis 3D" },
  { id: "flows", label: "Flujos" },
  { id: "density", label: "Densidad" },
];

function ControlButton({
  active = false,
  children,
  onClick,
  disabled = false,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      data-active={active}
      onClick={onClick}
      className="control-pill rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] disabled:cursor-progress disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function TopBar({
  visibleNodeCount,
  visibleFlowCount,
  viewMode,
  themeDepth,
  showLabels,
  showFlows,
  showCorridors,
  showFleetHeatmapControl,
  showFleetHeatmap,
  exportPending,
  presentation,
  onViewModeChange,
  onToggleThemeDepth,
  onToggleLabels,
  onToggleFlows,
  onToggleCorridors,
  onToggleFleetHeatmap,
  onResetCamera,
  onExport,
  onStartPresentation,
  onPausePresentation,
  onResumePresentation,
  onStopPresentation,
}: TopBarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 px-4 pb-2 pt-4"
    >
      <div className="panel-shell-strong rounded-[28px] px-4 py-4 lg:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
            <div className="min-w-0">
              <div className="font-['Rajdhani'] text-[0.72rem] font-semibold uppercase tracking-[0.42em] text-[var(--text-soft)]">
                SISLOPE / Centro de Comando Logistico del Peru
              </div>
              <h1 className="mt-2 font-['Rajdhani'] text-2xl font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)] lg:text-[2rem]">
                Sistema logistico y aduanero del Peru
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-[var(--text-soft)]">
                Mapa operativo de puertos, hubs interiores, flujos intermodales y nodos
                fronterizos, preparado para inteligencia logistica nacional.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Nodos visibles
                </div>
                <div className="mt-1 font-['Rajdhani'] text-xl font-semibold tracking-[0.08em] text-[var(--text-strong)]">
                  {visibleNodeCount}
                </div>
              </div>
              <div className="rounded-full border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Flujos activos
                </div>
                <div className="mt-1 font-['Rajdhani'] text-xl font-semibold tracking-[0.08em] text-[var(--text-strong)]">
                  {visibleFlowCount}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-1">
                <div className="flex flex-wrap gap-1">
                  {viewModes.map((mode) => (
                    <ControlButton
                      key={mode.id}
                      active={viewMode === mode.id}
                      onClick={() => onViewModeChange(mode.id)}
                    >
                      {mode.label}
                    </ControlButton>
                  ))}
                </div>
              </div>

              <ControlButton active={themeDepth === "dark"} onClick={onToggleThemeDepth}>
                {themeDepth === "dark" ? "Modo claro" : "Modo oscuro"}
              </ControlButton>
              <ControlButton active={showLabels} disabled={viewMode === "density"} onClick={onToggleLabels}>
                Etiquetas
              </ControlButton>
              <ControlButton active={showFlows} disabled={viewMode === "density"} onClick={onToggleFlows}>
                Flujos
              </ControlButton>
              <ControlButton
                active={showCorridors}
                disabled={viewMode === "density"}
                onClick={onToggleCorridors}
              >
                Corredores
              </ControlButton>
              {showFleetHeatmapControl ? (
                <ControlButton active={showFleetHeatmap} onClick={onToggleFleetHeatmap}>
                  Heatmap de flota
                </ControlButton>
              ) : null}
              <ControlButton onClick={onResetCamera}>Reiniciar camara</ControlButton>
              <ControlButton disabled={exportPending} onClick={onExport}>
                {exportPending ? "Exportando..." : "Exportar PNG"}
              </ControlButton>
            </div>

            <div className="flex flex-wrap gap-2">
              {!presentation.active ? (
                <ControlButton active={false} onClick={onStartPresentation}>
                  Modo presentacion
                </ControlButton>
              ) : (
                <>
                  <ControlButton active={!presentation.paused} onClick={onPausePresentation}>
                    {presentation.paused ? "Pausado" : "Pausar demo"}
                  </ControlButton>
                  <ControlButton active={presentation.paused} onClick={onResumePresentation}>
                    Continuar
                  </ControlButton>
                  <ControlButton onClick={onStopPresentation}>Detener</ControlButton>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
