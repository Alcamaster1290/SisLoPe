import { useEffect, useRef } from "react";
import { Deck, MapView, type Layer } from "@deck.gl/core";
import type { MapRenderSyncState } from "@/types/logistics";

interface DeckCanvasOverlayProps {
  syncState: MapRenderSyncState | null;
  layers: Layer[];
  onHealthChange: (healthy: boolean) => void;
  onReady: (deck: Deck<MapView[]> | null) => void;
}

const MAP_VIEW_ID = "logistics-map-view";
const MAP_VIEW = new MapView({ id: MAP_VIEW_ID, repeat: false });

export function DeckCanvasOverlay({
  syncState,
  layers,
  onHealthChange,
  onReady,
}: DeckCanvasOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck<MapView[]> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const deck = new Deck({
        parent: containerRef.current,
        controller: false,
        views: [MAP_VIEW],
        layers: [],
        useDevicePixels: Math.min(window.devicePixelRatio || 1, 2),
      }) as Deck<MapView[]>;

      deckRef.current = deck;
      onReady(deck);
      onHealthChange(true);
    } catch (error) {
      console.error("No se pudo inicializar el overlay de Deck.gl.", error);
      onReady(null);
      onHealthChange(false);
    }

    return () => {
      onReady(null);
      deckRef.current?.finalize();
      deckRef.current = null;
    };
  }, [onHealthChange, onReady]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck || !syncState) return;

    try {
      deck.setProps({
        width: syncState.width,
        height: syncState.height,
        viewState: {
          [MAP_VIEW_ID]: {
            longitude: syncState.longitude,
            latitude: syncState.latitude,
            zoom: syncState.zoom,
            pitch: syncState.pitch,
            bearing: syncState.bearing,
          },
        },
        layers,
      });
      onHealthChange(true);
    } catch (error) {
      console.error("Deck.gl no pudo sincronizarse con el estado del mapa.", error);
      onHealthChange(false);
    }
  }, [layers, onHealthChange, syncState]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[9] overflow-hidden" />;
}
