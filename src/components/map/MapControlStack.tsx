interface MapControlStackProps {
  isMapExpanded: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleMapExpanded: () => void;
}

export function MapControlStack({
  isMapExpanded,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleMapExpanded,
}: MapControlStackProps) {
  return (
    <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
      <button
        type="button"
        onClick={onZoomIn}
        className="control-pill flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
        aria-label="Acercar mapa"
      >
        +
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="control-pill flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-semibold"
        aria-label="Alejar mapa"
      >
        -
      </button>
      <button
        type="button"
        onClick={onResetView}
        className="control-pill min-h-11 rounded-2xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
      >
        Peru
      </button>
      <button
        type="button"
        onClick={onToggleMapExpanded}
        className="control-pill min-h-11 rounded-2xl px-3 py-2 text-sm font-semibold tracking-[0.18em]"
        aria-label={isMapExpanded ? "Restaurar panel" : "Expandir mapa"}
        title={isMapExpanded ? "Restaurar panel" : "Expandir mapa"}
      >
        {isMapExpanded ? "<<" : ">>"}
      </button>
    </div>
  );
}
