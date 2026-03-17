import { useEffect, useMemo, useRef } from "react";
import type { Map } from "maplibre-gl";
import * as THREE from "three";
import { getEmphasisNodes } from "@/layers/createNodeLayers";
import type {
  LogisticsNode,
  MapRenderSyncState,
  MapThemeDepth,
  MapViewMode,
} from "@/types/logistics";
import { CATEGORY_META, getCategoryColorHex, getNodeRadius } from "@/utils/colorScale";

interface ThreeNodeOverlayProps {
  map: Map | null;
  syncState: MapRenderSyncState | null;
  nodes: LogisticsNode[];
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  viewMode: MapViewMode;
  themeDepth: MapThemeDepth;
  active: boolean;
  onHealthChange: (healthy: boolean) => void;
}

interface PinRenderable {
  node: LogisticsNode;
  group: THREE.Group;
  aura: THREE.Mesh;
  base: THREE.Mesh;
  head: THREE.Mesh;
  emphasis: boolean;
  spin: number;
  phase: number;
  sizeBias: number;
}

interface EmphasisLabelDatum {
  node: LogisticsNode;
  color: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  anchorX: number;
  anchorY: number;
  controlX: number;
  controlY: number;
  side: "left" | "right";
}

function hashNodeId(nodeId: string): number {
  let hash = 0;
  for (let index = 0; index < nodeId.length; index += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function disposeRenderable(renderable: PinRenderable): void {
  for (const child of renderable.group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    child.geometry.dispose();

    const { material } = child;
    if (Array.isArray(material)) {
      for (const entry of material) entry.dispose();
    } else {
      material.dispose();
    }
  }
}

function createPinRenderable(
  node: LogisticsNode,
  themeDepth: MapThemeDepth,
  emphasis: boolean,
): PinRenderable {
  const color = new THREE.Color(getCategoryColorHex(node.category));
  const hash = hashNodeId(node.id);
  const strategicScale =
    node.strategicLevel === "national" ? 1.2 : node.strategicLevel === "regional" ? 1.08 : 0.96;
  const baseOpacity = themeDepth === "dark" ? 0.18 : 0.24;

  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 46),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? baseOpacity + 0.1 : baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.66, 0.3, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.92 : 0.76,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 1.12, 14),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.94 : 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  stem.position.y = 0.78;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 1 : 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  head.position.y = 1.46;

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.44, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.92 : 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  tip.position.y = -0.34;
  tip.rotation.z = Math.PI;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.92, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.72 : 0.54,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  ring.position.y = 0.04;

  const group = new THREE.Group();
  group.add(aura, base, stem, head, tip, ring);

  return {
    node,
    group,
    aura,
    base,
    head,
    emphasis,
    spin: 0.2 + (hash % 7) * 0.026,
    phase: (hash % 360) / 57.2958,
    sizeBias: strategicScale * (0.94 + (hash % 5) * 0.03),
  };
}

function getLabelPriority(
  node: LogisticsNode,
  hoveredNodeId: string | null,
  selectedNodeId: string | null,
): number {
  if (node.id === selectedNodeId) return 1000;
  if (node.id === hoveredNodeId) return 900;
  if (node.strategicLevel === "national") return 600;
  if (node.strategicLevel === "regional") return 400;
  return 200;
}

export function ThreeNodeOverlay({
  map,
  syncState,
  nodes,
  hoveredNodeId,
  selectedNodeId,
  viewMode,
  themeDepth,
  active,
  onHealthChange,
}: ThreeNodeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const renderablesRef = useRef<PinRenderable[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const emphasisNodes = useMemo(
    () => getEmphasisNodes(nodes, hoveredNodeId, selectedNodeId, viewMode),
    [hoveredNodeId, nodes, selectedNodeId, viewMode],
  );

  const labelData = useMemo<EmphasisLabelDatum[]>(() => {
    if (!active || !map || !syncState) return [];

    const width = Math.max(1, syncState.width);
    const height = Math.max(1, syncState.height);
    const maxLabels = syncState.zoom >= 7.4 ? 12 : 9;
    const occupiedBoxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];

    return [...emphasisNodes]
      .sort(
        (left, right) =>
          getLabelPriority(right, hoveredNodeId, selectedNodeId) -
          getLabelPriority(left, hoveredNodeId, selectedNodeId),
      )
      .slice(0, maxLabels)
      .reduce<EmphasisLabelDatum[]>((accumulator, node, index) => {
        const projected = map.project([node.lon, node.lat]);
        const visible =
          projected.x >= -64 &&
          projected.x <= width + 64 &&
          projected.y >= -64 &&
          projected.y <= height + 64;

        if (!visible) return accumulator;

        const side: "left" | "right" = projected.x < width * 0.5 ? "right" : "left";
        const sideOffset = side === "right" ? 36 : -36;
        const verticalOffset = -28 - (index % 4) * 14;
        const labelX = projected.x + sideOffset;
        const labelY = projected.y + verticalOffset;
        const labelWidth = Math.min(208, node.name.length * 7.1 + 30);
        const labelHeight = 30;

        const box =
          side === "right"
            ? {
                minX: labelX - 6,
                minY: labelY - labelHeight / 2,
                maxX: labelX + labelWidth,
                maxY: labelY + labelHeight / 2,
              }
            : {
                minX: labelX - labelWidth,
                minY: labelY - labelHeight / 2,
                maxX: labelX + 6,
                maxY: labelY + labelHeight / 2,
              };

        const collides = occupiedBoxes.some(
          (occupied) =>
            box.minX < occupied.maxX &&
            box.maxX > occupied.minX &&
            box.minY < occupied.maxY &&
            box.maxY > occupied.minY,
        );
        if (collides && node.id !== selectedNodeId && node.id !== hoveredNodeId) {
          return accumulator;
        }

        occupiedBoxes.push(box);

        accumulator.push({
          node,
          color: getCategoryColorHex(node.category),
          x: projected.x,
          y: projected.y,
          labelX,
          labelY,
          anchorX: side === "right" ? labelX - 6 : labelX + 6,
          anchorY: labelY,
          controlX: projected.x + sideOffset * 0.45,
          controlY: projected.y + verticalOffset * 0.56,
          side,
        });

        return accumulator;
      }, []);
  }, [active, emphasisNodes, hoveredNodeId, map, selectedNodeId, syncState]);

  useEffect(() => {
    if (!canvasRef.current || !map) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.z = 100;

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      onHealthChange(true);
    } catch (error) {
      console.error("No se pudo inicializar el renderer 3D del mapa.", error);
      onHealthChange(false);
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onHealthChange(false);
    };

    const handleContextRestored = () => {
      onHealthChange(true);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }

      for (const renderable of renderablesRef.current) {
        disposeRenderable(renderable);
      }

      renderablesRef.current = [];
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [map, onHealthChange]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const renderable of renderablesRef.current) {
      scene.remove(renderable.group);
      disposeRenderable(renderable);
    }

    renderablesRef.current = emphasisNodes.map((node) => {
      const emphasis = node.id === hoveredNodeId || node.id === selectedNodeId;
      const renderable = createPinRenderable(node, themeDepth, emphasis);
      scene.add(renderable.group);
      return renderable;
    });
  }, [emphasisNodes, hoveredNodeId, selectedNodeId, themeDepth]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera || !map || !syncState) return;

    if (!active) {
      renderer.clear();
      return;
    }

    const renderFrame = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

      const width = Math.max(1, syncState.width);
      const height = Math.max(1, syncState.height);

      if (canvasRef.current && (canvasRef.current.width !== width || canvasRef.current.height !== height)) {
        renderer.setSize(width, height, false);
      }

      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();

      renderer.clear();

      const now = performance.now() * 0.001;
      const zoomScale = syncState.zoom < 5.6 ? 1.08 : syncState.zoom > 8.2 ? 0.9 : 1;

      for (const renderable of renderablesRef.current) {
        const projected = map.project([renderable.node.lon, renderable.node.lat]);
        const visible =
          projected.x >= -80 &&
          projected.x <= width + 80 &&
          projected.y >= -80 &&
          projected.y <= height + 80;

        renderable.group.visible = visible;
        if (!visible) continue;

        const baseSize = getNodeRadius(renderable.node) * (renderable.emphasis ? 2.5 : 2.05);
        const pulse = 1 + Math.sin(now * (1.75 + renderable.spin) + renderable.phase) * 0.08;
        const auraPulse = 1.08 + Math.sin(now * 1.5 + renderable.phase * 0.8) * 0.12;

        renderable.group.position.set(projected.x - width / 2, height / 2 - projected.y, 0);
        renderable.group.scale.setScalar(baseSize * renderable.sizeBias * zoomScale * pulse);
        renderable.base.rotation.y = now * renderable.spin;
        renderable.head.scale.setScalar(0.96 + Math.cos(now * 2.2 + renderable.phase) * 0.06);
        renderable.aura.scale.setScalar(auraPulse);

        const auraMaterial = renderable.aura.material as THREE.MeshBasicMaterial;
        auraMaterial.opacity = renderable.emphasis
          ? 0.33 + Math.sin(now * 1.9 + renderable.phase) * 0.06
          : 0.22 + Math.sin(now * 1.45 + renderable.phase) * 0.04;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = window.requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, map, syncState]);

  const labelBackground =
    themeDepth === "dark" ? "rgba(8,13,20,0.86)" : "rgba(255,248,246,0.88)";

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10"
        style={{ opacity: active ? 1 : 0, transition: "opacity 220ms ease" }}
      />
      {active && syncState && labelData.length > 0 ? (
        <>
          <svg
            className="pointer-events-none absolute inset-0 z-[11]"
            width={syncState.width}
            height={syncState.height}
            viewBox={`0 0 ${syncState.width} ${syncState.height}`}
          >
            {labelData.map((item) => (
              <path
                key={`line-${item.node.id}`}
                d={`M ${item.x} ${item.y} Q ${item.controlX} ${item.controlY} ${item.anchorX} ${item.anchorY}`}
                fill="none"
                stroke={item.color}
                strokeOpacity={0.64}
                strokeWidth={1.1}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 z-[12]">
            {labelData.map((item) => (
              <div
                key={`label-${item.node.id}`}
                className="absolute rounded-xl border px-2 py-1 shadow-[0_10px_20px_rgba(0,0,0,0.24)] backdrop-blur-md"
                style={{
                  left: `${item.labelX}px`,
                  top: `${item.labelY}px`,
                  transform: item.side === "right" ? "translate(0, -50%)" : "translate(-100%, -50%)",
                  borderColor: `${item.color}78`,
                  backgroundColor: labelBackground,
                }}
              >
                <div className="font-['Rajdhani'] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-strong)]">
                  {item.node.name}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  {CATEGORY_META[item.node.category].shortLabel} / {item.node.strategicLevel}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
