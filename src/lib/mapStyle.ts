import type { StyleSpecification } from "maplibre-gl";

const DEFAULT_MAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const INLINE_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#03070d",
      },
    },
    {
      id: "carto-dark",
      type: "raster",
      source: "carto-dark",
      paint: {
        "raster-opacity": 0.92,
        "raster-saturation": -0.2,
        "raster-contrast": 0.08,
      },
    },
  ],
};

export function getMapStyle(): StyleSpecification | string {
  const externalStyle = import.meta.env.VITE_MAP_STYLE_URL?.trim();
  if (externalStyle) return externalStyle;
  if (import.meta.env.VITE_USE_INLINE_FALLBACK_STYLE === "false") {
    return DEFAULT_MAP_STYLE_URL;
  }
  return INLINE_FALLBACK_STYLE;
}
