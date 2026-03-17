import type { DepartmentId, LogisticsNode } from "@/types/logistics";

export interface DepartmentMeta {
  id: DepartmentId;
  label: string;
  center: [number, number];
  zoom: number;
}

export const PERU_DEPARTMENTS: DepartmentMeta[] = [
  { id: "amazonas", label: "Amazonas", center: [-77.88, -6.26], zoom: 6.35 },
  { id: "ancash", label: "Ancash", center: [-77.53, -9.38], zoom: 6.35 },
  { id: "apurimac", label: "Apurimac", center: [-73.25, -13.91], zoom: 6.5 },
  { id: "arequipa", label: "Arequipa", center: [-72.02, -16.37], zoom: 6.45 },
  { id: "ayacucho", label: "Ayacucho", center: [-74.21, -13.22], zoom: 6.5 },
  { id: "cajamarca", label: "Cajamarca", center: [-78.63, -7.18], zoom: 6.45 },
  { id: "cusco", label: "Cusco", center: [-71.97, -13.53], zoom: 6.45 },
  { id: "huancavelica", label: "Huancavelica", center: [-74.98, -12.79], zoom: 6.45 },
  { id: "huanuco", label: "Huanuco", center: [-76.24, -9.85], zoom: 6.4 },
  { id: "ica", label: "Ica", center: [-75.73, -14.11], zoom: 6.45 },
  { id: "junin", label: "Junin", center: [-75.33, -11.56], zoom: 6.4 },
  { id: "la_libertad", label: "La Libertad", center: [-78.92, -8.45], zoom: 6.45 },
  { id: "lambayeque", label: "Lambayeque", center: [-79.89, -6.71], zoom: 6.45 },
  { id: "lima", label: "Lima", center: [-76.86, -12.2], zoom: 6.7 },
  { id: "loreto", label: "Loreto", center: [-74.2, -4.2], zoom: 5.65 },
  { id: "madre_de_dios", label: "Madre de Dios", center: [-69.25, -12.63], zoom: 6.25 },
  { id: "moquegua", label: "Moquegua", center: [-70.95, -17.18], zoom: 6.55 },
  { id: "pasco", label: "Pasco", center: [-75.18, -10.72], zoom: 6.45 },
  { id: "piura", label: "Piura", center: [-80.63, -5.2], zoom: 6.5 },
  { id: "puno", label: "Puno", center: [-70.02, -15.84], zoom: 6.2 },
  { id: "san_martin", label: "San Martin", center: [-76.43, -6.45], zoom: 6.35 },
  { id: "tacna", label: "Tacna", center: [-70.26, -18.03], zoom: 6.75 },
  { id: "tumbes", label: "Tumbes", center: [-80.53, -3.64], zoom: 6.9 },
  { id: "ucayali", label: "Ucayali", center: [-74.57, -8.38], zoom: 6.35 },
];

const DEPARTMENT_SET = new Set<DepartmentId>(PERU_DEPARTMENTS.map((department) => department.id));
const DEPARTMENT_BY_ID = new Map(PERU_DEPARTMENTS.map((department) => [department.id, department]));

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function toDepartmentId(rawRegion: string): DepartmentId | null {
  const normalized = normalizeText(rawRegion);
  const mapped =
    normalized === "la libertad"
      ? "la_libertad"
      : normalized === "madre de dios"
        ? "madre_de_dios"
        : normalized === "san martin"
          ? "san_martin"
          : normalized;

  if (mapped === "callao") return "lima";
  if (DEPARTMENT_SET.has(mapped as DepartmentId)) return mapped as DepartmentId;
  return null;
}

export function getDepartmentForNode(node: Pick<LogisticsNode, "region">): DepartmentId | null {
  return toDepartmentId(node.region);
}

export function getDepartmentNodeCounts(nodes: LogisticsNode[]): Record<DepartmentId, number> {
  const counts = Object.fromEntries(PERU_DEPARTMENTS.map((department) => [department.id, 0])) as Record<
    DepartmentId,
    number
  >;

  for (const node of nodes) {
    const department = getDepartmentForNode(node);
    if (!department) continue;
    counts[department] += 1;
  }

  return counts;
}

function estimateZoomBySpan(span: number, fallbackZoom: number): number {
  if (span <= 0.18) return 9.1;
  if (span <= 0.35) return 8.45;
  if (span <= 0.7) return 7.85;
  if (span <= 1.15) return 7.25;
  if (span <= 1.8) return 6.7;
  return Math.max(5.8, fallbackZoom - 0.35);
}

export function getDepartmentFocus(
  departmentId: DepartmentId,
  nodes: LogisticsNode[],
): { longitude: number; latitude: number; zoom: number } {
  const departmentMeta = DEPARTMENT_BY_ID.get(departmentId);

  if (!departmentMeta) {
    return {
      longitude: -75.35,
      latitude: -9.45,
      zoom: 4.8,
    };
  }

  const departmentNodes = nodes.filter((node) => getDepartmentForNode(node) === departmentId);

  if (departmentNodes.length === 0) {
    return {
      longitude: departmentMeta.center[0],
      latitude: departmentMeta.center[1],
      zoom: departmentMeta.zoom,
    };
  }

  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const node of departmentNodes) {
    minLon = Math.min(minLon, node.lon);
    maxLon = Math.max(maxLon, node.lon);
    minLat = Math.min(minLat, node.lat);
    maxLat = Math.max(maxLat, node.lat);
  }

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;
  const span = Math.max(lonSpan, latSpan * 1.28);

  return {
    longitude: (minLon + maxLon) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom: estimateZoomBySpan(span, departmentMeta.zoom),
  };
}
