import { useEffect, useMemo, useState } from "react";
import type { LogisticsNode } from "@/types/logistics";
import type {
  MaritimeAlert,
  MaritimeShipmentSummary,
  MaritimeTrackingSnapshot,
  MaritimeTrackingStatus,
} from "@/types/maritime";
import type { MaritimeTrackingReadService } from "@/lib/maritimeTracking/service";
import { createNoopMaritimeTrackingReadService } from "@/lib/maritimeTracking/adapters/noop";

interface MaritimeTrackingPanelProps {
  node: LogisticsNode;
  shipmentRef?: string | null;
  service?: MaritimeTrackingReadService;
}

interface MaritimeTrackingPanelState {
  status: MaritimeTrackingStatus;
  summary: MaritimeShipmentSummary | null;
  latestSnapshot: MaritimeTrackingSnapshot | null;
  alerts: MaritimeAlert[];
  errorMessage: string | null;
}

const defaultService = createNoopMaritimeTrackingReadService();

function createInitialState(): MaritimeTrackingPanelState {
  return {
    status: "idle",
    summary: null,
    latestSnapshot: null,
    alerts: [],
    errorMessage: null,
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCoordinate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "Sin dato";
  return value.toFixed(4);
}

export default function MaritimeTrackingPanel({
  node,
  shipmentRef = null,
  service = defaultService,
}: MaritimeTrackingPanelProps) {
  const [state, setState] = useState<MaritimeTrackingPanelState>(() => createInitialState());

  useEffect(() => {
    let cancelled = false;

    if (!shipmentRef) return () => void (cancelled = true);

    void Promise.resolve()
      .then(async () => {
        if (cancelled) return;

        setState((current) => ({ ...current, status: "loading", errorMessage: null }));

        const [summary, latestSnapshot, alerts] = await Promise.all([
          service.getShipmentSummary({ shipmentRef }),
          service.getLatestSnapshot({ shipmentRef }),
          service.listAlerts({ shipmentRef }),
        ]);

        if (cancelled) return;

        const resolvedStatus = summary?.trackingStatus ?? (latestSnapshot ? "ready" : "empty");
        setState({
          status: resolvedStatus,
          summary,
          latestSnapshot,
          alerts,
          errorMessage: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          status: "error",
          summary: null,
          latestSnapshot: null,
          alerts: [],
          errorMessage: "No se pudo cargar el seguimiento maritimo.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [service, shipmentRef]);

  const maritimeContext = useMemo(() => {
    if (node.category === "port_sea") return "puerto maritimo";
    if (node.category === "port_river") return "puerto fluvial";
    return "nodo logistico";
  }, [node.category]);

  const resolvedState = useMemo<MaritimeTrackingPanelState>(() => {
    if (shipmentRef) return state;
    return {
      status: "empty",
      summary: null,
      latestSnapshot: null,
      alerts: [],
      errorMessage: null,
    };
  }, [shipmentRef, state]);

  return (
    <section className="space-y-3 rounded-[24px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
        Seguimiento maritimo
      </div>

      {resolvedState.status === "loading" ? (
        <div className="space-y-2" aria-label="Cargando seguimiento maritimo">
          <div
            className="h-12 rounded-[16px]"
            style={{ backgroundColor: "var(--surface-border)" }}
          />
          <div
            className="h-12 rounded-[16px]"
            style={{ backgroundColor: "var(--surface-border)" }}
          />
        </div>
      ) : null}

      {resolvedState.status === "error" ? (
        <div className="rounded-[18px] border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-soft)]">
          {resolvedState.errorMessage}
        </div>
      ) : null}

      {resolvedState.status === "empty" || resolvedState.status === "idle" ? (
        <div className="space-y-2 rounded-[18px] border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-soft)]">
          <p>
            La Fase 1 deja preparado el boundary tecnico para tracking maritimo sin tocar el mapa
            principal.
          </p>
          <p>
            {shipmentRef
              ? "Todavia no hay snapshots operativos ni un read model activo para este embarque."
              : `El ${maritimeContext} ${node.name} aun no tiene un embarque enlazado para mostrar seguimiento.`}
          </p>
        </div>
      ) : null}

      {resolvedState.status !== "loading" &&
      resolvedState.status !== "error" &&
      resolvedState.status !== "empty" &&
      resolvedState.status !== "idle" ? (
        <div className="space-y-3 text-sm text-[var(--text-main)]">
          <div className="grid gap-3 rounded-[18px] border border-[var(--surface-border)] px-3 py-3 sm:grid-cols-2">
            <div>
              <div className="text-[var(--text-soft)]">Estado</div>
              <div className="font-semibold text-[var(--text-strong)]">
                {resolvedState.summary?.statusSummary ?? "Seguimiento disponible"}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Ultimo sync</div>
              <div className="font-semibold text-[var(--text-strong)]">
                {formatDateTime(resolvedState.summary?.lastSyncedAt ?? null)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-[18px] border border-[var(--surface-border)] px-3 py-3 sm:grid-cols-2">
            <div>
              <div className="text-[var(--text-soft)]">Ultima posicion</div>
              <div className="font-semibold text-[var(--text-strong)]">
                {resolvedState.latestSnapshot
                  ? `${formatCoordinate(resolvedState.latestSnapshot.position.lat)}, ${formatCoordinate(resolvedState.latestSnapshot.position.lon)}`
                  : "Sin dato"}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">ETA</div>
              <div className="font-semibold text-[var(--text-strong)]">
                {formatDateTime(resolvedState.latestSnapshot?.eta ?? resolvedState.summary?.eta ?? null)}
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[var(--surface-border)] px-3 py-3">
            <div className="text-[var(--text-soft)]">Alertas abiertas</div>
            <div className="mt-1 font-semibold text-[var(--text-strong)]">{resolvedState.alerts.length}</div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
