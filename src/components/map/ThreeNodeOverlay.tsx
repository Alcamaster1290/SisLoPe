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
import { getCategoryColorHex, getNodeRadius } from "@/utils/colorScale";

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

interface GlowRenderable {
  node: LogisticsNode;
  group: THREE.Group;
  aura: THREE.Mesh;
  ring: THREE.Mesh;
  ringSecondary: THREE.Mesh;
  stem: THREE.Mesh;
  cap: THREE.Mesh;
  emphasis: boolean;
  spin: number;
  phase: number;
  sizeBias: number;
}

function hashNodeId(nodeId: string): number {
  let hash = 0;
  for (let index = 0; index < nodeId.length; index += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createGlowRenderable(
  node: LogisticsNode,
  themeDepth: MapThemeDepth,
  emphasis: boolean,
): GlowRenderable {
  const color = new THREE.Color(getCategoryColorHex(node.category));
  const hash = hashNodeId(node.id);
  const strategicScale =
    node.strategicLevel === "national" ? 1.2 : node.strategicLevel === "regional" ? 1.08 : 0.96;
  const baseOpacity = themeDepth === "deep-dark" ? 0.14 : 0.22;

  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 44),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? baseOpacity + 0.08 : baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.84, 1.04, 46),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.9 : 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );

  const ringSecondary = new THREE.Mesh(
    new THREE.RingGeometry(1.16, 1.26, 36),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.44 : 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1.55, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.62 : 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  stem.position.y = 1.05;

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: emphasis ? 0.95 : 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  cap.position.set(0, 1.92, 0.1);

  const group = new THREE.Group();
  group.add(aura, ring, ringSecondary, stem, cap);

  return {
    node,
    group,
    aura,
    ring,
    ringSecondary,
    stem,
    cap,
    emphasis,
    spin: 0.22 + (hash % 7) * 0.035,
    phase: (hash % 360) / 57.2958,
    sizeBias: strategicScale * (0.94 + (hash % 5) * 0.03),
  };
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
  const renderablesRef = useRef<GlowRenderable[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const emphasisNodes = useMemo(
    () => getEmphasisNodes(nodes, hoveredNodeId, selectedNodeId, viewMode),
    [hoveredNodeId, nodes, selectedNodeId, viewMode],
  );

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
    }

    renderablesRef.current = emphasisNodes.map((node) => {
      const emphasis = node.id === hoveredNodeId || node.id === selectedNodeId;
      const renderable = createGlowRenderable(node, themeDepth, emphasis);
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
      const zoomScale = syncState.zoom < 5.6 ? 1.12 : syncState.zoom > 8.2 ? 0.9 : 1;

      for (const renderable of renderablesRef.current) {
        const projected = map.project([renderable.node.lon, renderable.node.lat]);
        const visible =
          projected.x >= -80 &&
          projected.x <= width + 80 &&
          projected.y >= -80 &&
          projected.y <= height + 80;

        renderable.group.visible = visible;
        if (!visible) continue;

        const baseSize = getNodeRadius(renderable.node) * (renderable.emphasis ? 2.7 : 2.05);
        const pulse = 1 + Math.sin(now * (1.8 + renderable.spin) + renderable.phase) * 0.11;
        const auraPulse = 1.1 + Math.sin(now * 1.5 + renderable.phase * 0.8) * 0.12;
        const capPulse = 0.95 + Math.cos(now * 2.25 + renderable.phase) * 0.07;
        const ringTwist = now * renderable.spin;
        const secondaryTwist = -now * renderable.spin * 1.36;

        renderable.group.position.set(projected.x - width / 2, height / 2 - projected.y, 0);
        renderable.group.scale.setScalar(baseSize * renderable.sizeBias * zoomScale * pulse);
        renderable.ring.rotation.z = ringTwist;
        renderable.ringSecondary.rotation.z = secondaryTwist;
        renderable.aura.scale.setScalar(auraPulse);
        renderable.cap.scale.setScalar(capPulse);

        const auraMaterial = renderable.aura.material as THREE.MeshBasicMaterial;
        const secondaryMaterial = renderable.ringSecondary.material as THREE.MeshBasicMaterial;
        auraMaterial.opacity = renderable.emphasis
          ? 0.34 + Math.sin(now * 2.1 + renderable.phase) * 0.06
          : 0.2 + Math.sin(now * 1.65 + renderable.phase) * 0.04;
        secondaryMaterial.opacity = renderable.emphasis ? 0.52 : 0.34;
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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10"
      style={{ opacity: active ? 1 : 0, transition: "opacity 220ms ease" }}
    />
  );
}
