import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapControlStack } from "@/components/map/MapControlStack";

describe("MapControlStack", () => {
  it("muestra >> al contraer y << al restaurar", () => {
    const toggleSpy = vi.fn();
    const { rerender } = render(
      <MapControlStack
        isMapExpanded={false}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        onResetView={() => undefined}
        onToggleMapExpanded={toggleSpy}
      />,
    );

    const expandButton = screen.getByRole("button", { name: /expandir mapa/i });
    expect(expandButton).toHaveTextContent(">>");
    fireEvent.click(expandButton);
    expect(toggleSpy).toHaveBeenCalledTimes(1);

    rerender(
      <MapControlStack
        isMapExpanded={true}
        onZoomIn={() => undefined}
        onZoomOut={() => undefined}
        onResetView={() => undefined}
        onToggleMapExpanded={toggleSpy}
      />,
    );

    expect(screen.getByRole("button", { name: /restaurar panel/i })).toHaveTextContent("<<");
    expect(screen.getByRole("button", { name: /peru/i })).toBeInTheDocument();
  });
});
