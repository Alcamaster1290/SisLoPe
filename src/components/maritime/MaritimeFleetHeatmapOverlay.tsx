import type { MaritimeFleetHeatmapCoverage, MaritimeFleetHeatmapSnapshot, MaritimeFleetHeatmapStatus } from "@/types/maritimeFleetHeatmap";

interface MaritimeFleetHeatmapOverlayProps {
  active: boolean;
  status: MaritimeFleetHeatmapStatus;
  snapshot: MaritimeFleetHeatmapSnapshot | null;
  coverage: MaritimeFleetHeatmapCoverage | null;
  errorMessage: string | null;
}

function formatSnapshotDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function MaritimeFleetHeatmapOverlay({
  active,
  status,
  snapshot,
  coverage,
  errorMessage,
}: MaritimeFleetHeatmapOverlayProps) {
  if (!active) {
    return null;
  }

  const note = coverage?.coverageNote ?? snapshot?.coverageNote ?? "Cobertura referencial, parcial en corredores fluviales.";
  const formattedDate = formatSnapshotDate(snapshot?.snapshotDate ?? coverage?.snapshotDate ?? null);

  return (
    <div className="pointer-events-none absolute left-5 top-5 z-20 max-w-[20rem] rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-2)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-lg">
      <div className="font-['Rajdhani'] text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
        Heatmap de flota
      </div>
      {status === "loading" ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-main)]">Cargando densidad diaria maritima y fluvial...</p>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-main)]">{errorMessage ?? "No se pudo cargar el heatmap diario."}</p>
      ) : null}
      {status === "empty" ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-main)]">Sin cobertura diaria disponible para el area operativa.</p>
      ) : null}
      {status === "ready" ? (
        <>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            <span className="rounded-full border border-[var(--surface-border)] px-2 py-1">Actualizado: {formattedDate ?? snapshot?.snapshotDate}</span>
            <span className="rounded-full border border-[var(--surface-border)] px-2 py-1">{snapshot?.sourceName ?? coverage?.sourceName}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-main)]">{note}</p>
        </>
      ) : null}
    </div>
  );
}
