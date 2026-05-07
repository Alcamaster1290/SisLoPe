import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckCanvasOverlay } from "@/components/map/DeckCanvasOverlay";

vi.mock("@deck.gl/core", () => {
  class FakeDeck {
    parent: HTMLElement;
    constructor({ parent }: { parent: HTMLElement }) {
      this.parent = parent;
      const canvas = document.createElement("canvas");
      canvas.id = "deckgl-overlay";
      parent.appendChild(canvas);
    }
    setProps() {}
    finalize() {}
  }

  class FakeMapView {
    constructor(public props: unknown) {}
  }

  return { Deck: FakeDeck, MapView: FakeMapView };
});

describe("DeckCanvasOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("removes deck-injected canvases on unmount so StrictMode remounts do not leak zombie overlays", () => {
    const { container, unmount } = render(
      <DeckCanvasOverlay
        syncState={null}
        layers={[]}
        onHealthChange={() => undefined}
        onReady={() => undefined}
      />,
    );

    expect(container.querySelectorAll("canvas")).toHaveLength(1);

    unmount();

    expect(container.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("does not leave duplicate canvases after a simulated double mount", () => {
    const first = render(
      <DeckCanvasOverlay
        syncState={null}
        layers={[]}
        onHealthChange={() => undefined}
        onReady={() => undefined}
      />,
    );
    first.unmount();

    const second = render(
      <DeckCanvasOverlay
        syncState={null}
        layers={[]}
        onHealthChange={() => undefined}
        onReady={() => undefined}
      />,
    );

    expect(second.container.querySelectorAll("canvas")).toHaveLength(1);

    second.unmount();
  });
});
