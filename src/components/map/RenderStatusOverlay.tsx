import { motion } from "framer-motion";
import type { MapStatus, RenderHealth } from "@/types/logistics";

interface RenderStatusOverlayProps {
  mapStatus: MapStatus;
  renderHealth: RenderHealth;
  onRetry: () => void;
}

function getStatusCopy(
  mapStatus: MapStatus,
  renderHealth: RenderHealth,
): { title: string; description: string } {
  if (mapStatus === "failed") {
    return {
      title: "Mapa no disponible",
      description:
        "La base cartografica no termino de inicializar. Reintenta para reconstruir el pipeline WebGL.",
    };
  }

  if (mapStatus === "degraded") {
    if (!renderHealth.three) {
      return {
        title: "Mapa operativo en modo degradado",
        description:
          "El enfasis 3D se desactivo para proteger la estabilidad. Las capas 2D y los flujos siguen activos.",
      };
    }

    if (!renderHealth.deck) {
      return {
        title: "Mapa base disponible, capas analiticas degradadas",
        description:
          "Deck.gl no esta renderizando capas analiticas. El mapa base y el clustering siguen visibles mientras se recupera la vista.",
      };
    }
  }

  return {
    title: "Inicializando centro de comando",
    description:
      "Cargando base cartografica, sincronizando capas y verificando la salud del render geoespacial.",
  };
}

export function RenderStatusOverlay({
  mapStatus,
  renderHealth,
  onRetry,
}: RenderStatusOverlayProps) {
  if (mapStatus === "ready") return null;

  const copy = getStatusCopy(mapStatus, renderHealth);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="panel-shell-strong pointer-events-auto max-w-md rounded-[28px] px-5 py-5"
      >
        <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
          Estado del render
        </div>
        <h3 className="mt-3 font-['Rajdhani'] text-2xl font-semibold uppercase tracking-[0.08em] text-[var(--text-strong)]">
          {copy.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--text-main)]">{copy.description}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            MapLibre {renderHealth.maplibre ? "OK" : "OFF"}
          </span>
          <span className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Deck {renderHealth.deck ? "OK" : "OFF"}
          </span>
          <span className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Three {renderHealth.three ? "OK" : "OFF"}
          </span>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="control-pill mt-5 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Reintentar mapa
        </button>
      </motion.div>
    </div>
  );
}
