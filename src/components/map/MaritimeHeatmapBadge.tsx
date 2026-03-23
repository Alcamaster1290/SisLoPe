import type {
  MaritimeFleetHeatmapCoverage,
  MaritimeFleetHeatmapSnapshot,
  MaritimeFleetHeatmapStatus,
} from "@/types/maritimeHeatmap";

interface MaritimeHeatmapBadgeProps {
  enabled: boolean;
  status: MaritimeFleetHeatmapStatus;
  snapshot: MaritimeFleetHeatmapSnapshot | null;
  coverage: MaritimeFleetHeatmapCoverage | null;
  errorMessage: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(date);
}

function getCoverageMessage(
  coverage: MaritimeFleetHeatmapCoverage | null,
  errorMessage: string | null,
): string {
  if (errorMessage) {
    return errorMessage;
  }

  if (coverage?.coverageNote) {
    return coverage.coverageNote;
  }

  return "Cobertura referencial, parcial en corredores fluviales.";
}

export function MaritimeHeatmapBadge({
  enabled,
  status,
  snapshot,
  coverage,
  errorMessage,
}: MaritimeHeatmapBadgeProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-5 top-5 z-20 max-w-[19rem] rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-2)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-lg">
      <div className="font-['Rajdhani'] text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">
        Heatmap de flota
      </div>
      <div className="mt-1 font-['Rajdhani'] text-lg font-semibold uppercase tracking-[0.08em] text-[var(--text-strong)]">
        {status === "loading"
          ? "Cargando capa diaria"
          : status === "error"
            ? "Sin capa disponible"
            : status === "empty"
              ? "Sin cobertura diaria"
              : "Cobertura diaria activa"}
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--text-main)]">
        {getCoverageMessage(coverage, errorMessage)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--text-soft)]">
        <div>
          <div className="uppercase tracking-[0.16em]">Actualizado</div>
          <div className="mt-1 font-semibold text-[var(--text-strong)]">
            {formatDate(snapshot?.updatedAt ?? null)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-[0.16em]">Fuente</div>
          <div className="mt-1 font-semibold text-[var(--text-strong)]">
            {snapshot?.sourceName ?? coverage?.sourceName ?? "Sin dato"}
          </div>
        </div>
      </div>
    </div>
  );
}
