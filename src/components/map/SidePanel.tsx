import { motion } from "framer-motion";
import type { LogisticsNode } from "@/types/logistics";
import { CATEGORY_META } from "@/utils/colorScale";
import {
  formatCategory,
  formatCoordinate,
  formatLocation,
  formatMacrozone,
  formatStrategicLevel,
  formatTerrain,
} from "@/utils/format";

interface SidePanelProps {
  node: LogisticsNode | null;
  connections: LogisticsNode[];
  onFocusNode: (nodeId: string) => void;
  onClose: () => void;
}

function getOperationalRole(node: LogisticsNode): string {
  switch (node.category) {
    case "port_sea":
      return "Interfaz maritima principal para comercio exterior, graneles y distribucion portuaria.";
    case "port_river":
      return "Interfaz fluvial para abastecimiento amazonico, enlace intermodal y consolidacion regional.";
    case "airport":
      return "Soporte a carga aerea, importacion urgente y conexion multimodal con nodos terrestres.";
    case "border":
      return "Control aduanero, transito internacional y articulacion de corredores binacionales.";
    case "freezone":
      return "Plataforma de regimen especial orientada a almacenamiento, transformacion y facilitacion comercial.";
    case "inland_hub":
      return "Centro de consolidacion interior con funcion de distribucion, almacenamiento y transferencia modal.";
    case "corridor_anchor":
      return "Punto de anclaje para corredores estrategicos y visualizacion de cadenas logisticas.";
  }
}

export default function SidePanel({
  node,
  connections,
  onFocusNode,
  onClose,
}: SidePanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="panel-shell thin-scrollbar order-3 flex min-h-[18rem] flex-col overflow-hidden rounded-[28px] lg:min-h-0"
    >
      {!node ? (
        <div className="flex h-full flex-col justify-between px-5 py-5">
          <div>
            <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
              Detalle del nodo
            </div>
            <h2 className="mt-2 font-['Rajdhani'] text-2xl font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
              Selecciona un nodo
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-main)]">
              Haz clic sobre un nodo o usa la busqueda para fijar el panel. El doble clic acerca la
              vista operativa y el modo demo recorre los puntos criticos del sistema.
            </p>
          </div>

          <div className="grid gap-3 rounded-[22px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Campos previstos
            </div>
            <div className="text-sm text-[var(--text-main)]">
              Nombre completo, categoria, ubicacion, funcion logistica, conexiones, tags y codigos
              operativos.
            </div>
          </div>
        </div>
      ) : (
        <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
                Nodo seleccionado
              </div>
              <h2 className="mt-2 font-['Rajdhani'] text-[1.75rem] font-semibold uppercase leading-tight tracking-[0.08em] text-[var(--text-strong)]">
                {node.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle y volver a la vista previa"
              title="Cerrar"
              className="control-pill flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold uppercase tracking-[0.18em]"
            >
              X
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{
                borderColor: `${CATEGORY_META[node.category].color}66`,
                backgroundColor: `${CATEGORY_META[node.category].color}12`,
                color: "var(--text-strong)",
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_META[node.category].color }}
              />
              {formatCategory(node.category)}
            </span>
            <span className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              {formatStrategicLevel(node.strategicLevel)}
            </span>
            {node.isApprox ? (
              <span className="rounded-full border border-[var(--surface-border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Punto aproximado
              </span>
            ) : null}
          </div>

          <div className="mt-5 space-y-5">
            <section className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Ubicacion
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-strong)]">{formatLocation(node)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--text-main)]">
                <div>
                  <div className="text-[var(--text-soft)]">Macrozona</div>
                  <div>{formatMacrozone(node.macrozone)}</div>
                </div>
                <div>
                  <div className="text-[var(--text-soft)]">Terreno</div>
                  <div>{formatTerrain(node.terrain)}</div>
                </div>
                <div>
                  <div className="text-[var(--text-soft)]">Latitud</div>
                  <div>{formatCoordinate(node.lat, "lat")}</div>
                </div>
                <div>
                  <div className="text-[var(--text-soft)]">Longitud</div>
                  <div>{formatCoordinate(node.lon, "lon")}</div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Descripcion logistica
              </div>
              <p className="text-sm leading-7 text-[var(--text-main)]">{node.description}</p>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Funcion aduanera / logistica
              </div>
              <p className="text-sm leading-7 text-[var(--text-main)]">{getOperationalRole(node)}</p>
            </section>

            <section className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-soft)]">Codigo operativo</span>
                  <span className="font-semibold text-[var(--text-strong)]">{node.code ?? "No disponible"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-soft)]">Region</span>
                  <span className="font-semibold text-[var(--text-strong)]">{node.region}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-soft)]">Provincia</span>
                  <span className="font-semibold text-[var(--text-strong)]">{node.province ?? "Sin dato"}</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-3 py-2 text-xs font-semibold text-[var(--text-main)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Conexiones sugeridas
              </div>
              <div className="space-y-2">
                {connections.length > 0 ? (
                  connections.map((connection) => (
                    <button
                      key={connection.id}
                      type="button"
                      onClick={() => onFocusNode(connection.id)}
                      className="flex w-full items-center justify-between rounded-[18px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-3 py-3 text-left transition hover:border-[var(--surface-border-strong)]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-strong)]">{connection.name}</div>
                        <div className="text-xs text-[var(--text-soft)]">{formatCategory(connection.category)}</div>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                        Ir
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[var(--surface-border)] px-3 py-4 text-sm text-[var(--text-soft)]">
                    Este nodo no tiene conexiones registradas en el dataset inicial.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
