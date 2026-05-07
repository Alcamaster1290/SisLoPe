import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SidePanel from "@/components/map/SidePanel";

describe("SidePanel command center", () => {
  it("links logistics proposal definition to ADEX Palletizer", () => {
    const expectedAdexUrl =
      import.meta.env.VITE_ADEX_URL?.trim() || "https://adex-palletizer.vercel.app";

    render(
      <SidePanel
        node={null}
        connections={[]}
        onFocusNode={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const proposalLink = screen.getByRole("link", {
      name: /Definir mi Propuesta Logistica/i,
    });

    expect(proposalLink).toHaveAttribute("href", expectedAdexUrl);
    expect(proposalLink).toHaveAttribute("target", "_blank");
  });
});
