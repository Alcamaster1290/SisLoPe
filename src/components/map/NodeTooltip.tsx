import { AnimatePresence, motion } from "framer-motion";
import type { LogisticsNode, TooltipState } from "@/types/logistics";
import { formatCategory, formatCoordinate, formatStrategicLevel } from "@/utils/format";

interface NodeTooltipProps {
  node: LogisticsNode | null;
  tooltip: TooltipState | null;
}

export function NodeTooltip({ node, tooltip }: NodeTooltipProps) {
  return (
    <AnimatePresence>
      {node && tooltip ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none absolute z-30 w-[18rem] rounded-[20px] border border-[var(--surface-border-strong)] bg-[rgba(3,7,13,0.92)] px-4 py-3 shadow-[var(--shadow-elevated)]"
          style={{
            left: tooltip.x + 18,
            top: tooltip.y + 18,
          }}
        >
          <div className="font-['Rajdhani'] text-lg font-semibold uppercase tracking-[0.08em] text-[var(--text-strong)]">
            {node.name}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
            {formatCategory(node.category)} / {formatStrategicLevel(node.strategicLevel)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-main)]">
            <div>
              <div className="text-[var(--text-soft)]">Región</div>
              <div>{node.region}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Provincia</div>
              <div>{node.province ?? "Sin dato"}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Lat</div>
              <div>{formatCoordinate(node.lat, "lat")}</div>
            </div>
            <div>
              <div className="text-[var(--text-soft)]">Lon</div>
              <div>{formatCoordinate(node.lon, "lon")}</div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-main)]">{node.description}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
