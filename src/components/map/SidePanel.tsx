import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import type { LogisticsNode } from "@/types/logistics";
import { getMaritimeTrackingFeatureFlags } from "@/lib/maritimeTracking/flags";
import { CATEGORY_META } from "@/utils/colorScale";
import {
  formatCategory,
  formatCoordinate,
  formatLocation,
  formatMacrozone,
  formatStrategicLevel,
  formatTerrain,
} from "@/utils/format";

const LazyMaritimeTrackingPanel = lazy(
  () => import("@/components/maritime/MaritimeTrackingPanel"),
);

const ADEX_URL =
  import.meta.env.VITE_ADEX_URL?.trim() || "https://adex-palletizer.vercel.app";

/* ------------------------------------------------------------------ */
/*  Operational profile per node category                             */
/* ------------------------------------------------------------------ */

interface OperationalProfile {
  operationTypes: string[];
  customsRole: string;
  connectivity: string;
  risks: string;
  suggestedModes: string[];
}

function getOperationalProfile(node: LogisticsNode): OperationalProfile {
  switch (node.category) {
    case "port_sea":
      return {
        operationTypes: ["Importacion maritima", "Exportacion maritima", "Transbordo"],
        customsRole: "Despacho directo e indirecto. Zona primaria aduanera.",
        connectivity: "Rutas maritimas internacionales, interconexion terrestre a hubs interiores.",
        risks: "Congestion portuaria, sobrestadia, restricciones de calado.",
        suggestedModes: ["Maritimo", "Multimodal maritimo-terrestre"],
      };
    case "port_river":
      return {
        operationTypes: ["Abastecimiento fluvial", "Exportacion regional"],
        customsRole: "Despacho simplificado. Intendencia regional.",
        connectivity: "Vias fluviales amazonicas, enlace a red vial nacional.",
        risks: "Estacionalidad del caudal, capacidad limitada.",
        suggestedModes: ["Fluvial", "Multimodal fluvial-terrestre"],
      };
    case "airport":
      return {
        operationTypes: ["Importacion aerea", "Exportacion de perecederos", "Carga urgente"],
        customsRole: "Despacho aereo. Zona de carga aduanera.",
        connectivity: "Vuelos nacionales e internacionales, acceso terrestre.",
        risks: "Capacidad de bodega limitada, costo por kg elevado.",
        suggestedModes: ["Aereo", "Multimodal aereo-terrestre"],
      };
    case "border":
      return {
        operationTypes: ["Transito internacional", "Importacion terrestre", "Exportacion terrestre"],
        customsRole: "Control fronterizo. CEBAF o paso autorizado.",
        connectivity: "Corredores binacionales, red vial internacional.",
        risks: "Congestion en temporada alta, requisitos fitosanitarios.",
        suggestedModes: ["Terrestre"],
      };
    case "freezone":
      return {
        operationTypes: ["Almacenamiento bajo regimen especial", "Transformacion", "Reexportacion"],
        customsRole: "Regimen de zona franca. Beneficios tributarios.",
        connectivity: "Acceso a puerto o aeropuerto cercano.",
        risks: "Regulaciones de zona franca, limites de permanencia.",
        suggestedModes: ["Terrestre"],
      };
    case "inland_hub":
      return {
        operationTypes: ["Consolidacion", "Distribucion regional", "Cross-docking"],
        customsRole: "Deposito temporal o zona secundaria.",
        connectivity: "Convergencia de corredores terrestres.",
        risks: "Dependencia de infraestructura vial.",
        suggestedModes: ["Terrestre", "Multimodal"],
      };
    case "corridor_anchor":
      return {
        operationTypes: ["Transito de corredores", "Consolidacion estrategica"],
        customsRole: "Referencia logistica. Sin despacho directo.",
        connectivity: "Articulacion de cadenas logisticas nacionales.",
        risks: "Variable segun corredor asociado.",
        suggestedModes: ["Terrestre"],
      };
  }
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

/* ------------------------------------------------------------------ */
/*  Operational profile display component                             */
/* ------------------------------------------------------------------ */

function OperationalProfileSection({ node }: { node: LogisticsNode }) {
  const profile = getOperationalProfile(node);
  return (
    <section className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
        Modo operativo
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <div className="text-[var(--text-soft)]">Tipos de operacion</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {profile.operationTypes.map((type) => (
              <span
                key={type}
                className="rounded-full border border-[var(--surface-border)] px-2.5 py-1 text-xs text-[var(--text-main)]"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[var(--text-soft)]">Rol aduanero</div>
          <div className="text-[var(--text-main)]">{profile.customsRole}</div>
        </div>
        <div>
          <div className="text-[var(--text-soft)]">Conectividad</div>
          <div className="text-[var(--text-main)]">{profile.connectivity}</div>
        </div>
        <div>
          <div className="text-[var(--text-soft)]">Riesgos conocidos</div>
          <div className="text-[var(--text-main)]">{profile.risks}</div>
        </div>
        <div>
          <div className="text-[var(--text-soft)]">Modo sugerido</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {profile.suggestedModes.map((mode) => (
              <span
                key={mode}
                className="rounded-full border border-[var(--surface-border)] px-2.5 py-1 text-xs font-semibold text-[var(--text-strong)]"
              >
                {mode}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SidePanel                                                         */
/* ------------------------------------------------------------------ */

interface SidePanelProps {
  node: LogisticsNode | null;
  connections: LogisticsNode[];
  onFocusNode: (nodeId: string) => void;
  onClose: () => void;
}

export default function SidePanel({
  node,
  connections,
  onFocusNode,
  onClose,
}: SidePanelProps) {
  const maritimeTracking = getMaritimeTrackingFeatureFlags();
  const showMaritimeTracking =
    maritimeTracking.enabled &&
    !!node &&
    (node.category === "port_sea" || node.category === "port_river");

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="panel-shell thin-scrollbar order-3 flex min-h-[18rem] flex-col overflow-hidden rounded-[28px] lg:min-h-0"
    >
      {!node ? (
        /* -------------------------------------------------------- */
        /*  Empty state — task-oriented entrypoints                 */
        /* -------------------------------------------------------- */
        <div className="flex h-full flex-col gap-5 px-5 py-5">
          <div>
            <div className="font-['Rajdhani'] text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft)]">
              Centro operativo
            </div>
            <h2 className="mt-2 font-['Rajdhani'] text-2xl font-semibold uppercase tracking-[0.1em] text-[var(--text-strong)]">
              Que necesitas hacer?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-main)]">
              Selecciona una opcion o haz clic en un nodo del mapa para ver su perfil operativo.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={ADEX_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-[22px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4 transition hover:border-[var(--surface-border-strong)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a6a72]/15 text-xs font-bold text-[#0a6a72]">
                  IM
                </span>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-strong)]">
                  Quiero importar
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
                Planifica embalaje con ADEX Palletizer y calcula costos aterrizados con el
                Expediente de Costos.
              </p>
            </a>

            <a
              href={ADEX_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-[22px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4 transition hover:border-[var(--surface-border-strong)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6a3d0a]/15 text-xs font-bold text-[#6a3d0a]">
                  EX
                </span>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-strong)]">
                  Quiero exportar
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
                Evalua costos de exportacion, documentacion aduanera y rutas de salida desde
                puertos peruanos.
              </p>
            </a>

            <div className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#921e1e]/15 text-xs font-bold text-[#921e1e]">
                  NO
                </span>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-strong)]">
                  Evaluar un nodo
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-main)]">
                Haz clic sobre un puerto, aeropuerto, hub o frontera en el mapa para ver su
                funcion operativa, conexiones y modo sugerido.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------- */
        /*  Populated state — node detail + operational profile     */
        /* -------------------------------------------------------- */
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

            {/* Operational profile — types, customs, connectivity, risks, modes */}
            <OperationalProfileSection node={node} />

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

            {/* Ecosystem links */}
            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                Ecosistema ADEX
              </div>
              <a
                href={ADEX_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="flex w-full items-center justify-between rounded-[18px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] px-3 py-3 text-left transition hover:border-[var(--surface-border-strong)]"
              >
                <div>
                  <div className="font-semibold text-[var(--text-strong)]">ADEX Palletizer</div>
                  <div className="text-xs text-[var(--text-soft)]">Planificar embalaje y paletizacion</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Abrir
                </span>
              </a>
            </section>

            {showMaritimeTracking && node ? (
              <Suspense
                fallback={
                  <section className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--panel-backdrop)] p-4">
                    <div
                      className="h-16 rounded-[18px]"
                      style={{ backgroundColor: "var(--surface-border)" }}
                    />
                  </section>
                }
              >
                <LazyMaritimeTrackingPanel node={node} />
              </Suspense>
            ) : null}
          </div>
        </div>
      )}
    </motion.aside>
  );
}
