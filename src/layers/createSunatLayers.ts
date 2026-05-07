import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { SunatOffice } from '@/data/sunatOffices'

// Yellow palette for SUNAT / customs
const SUNAT_FILL: [number, number, number] = [255, 193, 7]    // amber-400
const SUNAT_STROKE: [number, number, number] = [255, 255, 255]
const SUNAT_HALO: [number, number, number] = [255, 220, 60]

interface SunatLayerOptions {
  offices: readonly SunatOffice[]
  mapZoom: number
  visible?: boolean
}

export function createSunatLayers({ offices, mapZoom, visible = true }: SunatLayerOptions) {
  const showLabels = mapZoom >= 6.8

  return [
    // ── Glow halo ─────────────────────────────────────────────────────────
    new ScatterplotLayer<SunatOffice>({
      id: 'sunat-halo',
      data: offices as SunatOffice[],
      visible,
      pickable: false,
      stroked: false,
      filled: true,
      radiusUnits: 'pixels',
      radiusMinPixels: 10,
      radiusMaxPixels: 24,
      getPosition: (o) => [o.lon, o.lat],
      getRadius: () => 11,
      getFillColor: () => [...SUNAT_HALO, 45] as [number, number, number, number],
    }),

    // ── Main dot ──────────────────────────────────────────────────────────
    new ScatterplotLayer<SunatOffice>({
      id: 'sunat-scatter',
      data: offices as SunatOffice[],
      visible,
      pickable: false,
      stroked: true,
      filled: true,
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 1.5,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      getPosition: (o) => [o.lon, o.lat],
      getRadius: (o) => (o.type === 'agencia' ? 4.5 : 6),
      getFillColor: () => [...SUNAT_FILL, 220] as [number, number, number, number],
      getLineColor: () => [...SUNAT_STROKE, 200] as [number, number, number, number],
    }),

    // ── Labels ────────────────────────────────────────────────────────────
    new TextLayer<SunatOffice>({
      id: 'sunat-labels',
      data: offices as SunatOffice[],
      visible: visible && showLabels,
      pickable: false,
      billboard: true,
      fontFamily: 'Geneva, "Lucida Sans Unicode", "Lucida Grande", Verdana, Tahoma, sans-serif',
      fontWeight: 600,
      characterSet: 'auto',
      getPosition: (o) => [o.lon, o.lat],
      getText: (o) => o.shortName,
      getSize: () => (mapZoom >= 8 ? 11.5 : 10.5),
      sizeUnits: 'pixels',
      getTextAnchor: () => 'start',
      getAlignmentBaseline: () => 'center',
      getPixelOffset: () => [8, 0],
      getColor: () => [255, 220, 80, 230] as [number, number, number, number],
      getBackgroundColor: () => [8, 14, 20, 170] as [number, number, number, number],
      background: true,
      backgroundPadding: [4, 2],
      getBorderColor: () => [180, 140, 0, 60] as [number, number, number, number],
      getBorderWidth: 1,
    }),
  ]
}
