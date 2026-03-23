import { describe, expect, it } from "vitest";
import { createNoopMaritimeTrackingReadService } from "@/lib/maritimeTracking/adapters/noop";

describe("noop maritime tracking service", () => {
  it("returns empty read-model payloads without side effects", async () => {
    const service = createNoopMaritimeTrackingReadService();

    await expect(service.getShipmentSummary({ shipmentRef: "SHIP-001" })).resolves.toBeNull();
    await expect(service.getLatestSnapshot({ shipmentRef: "SHIP-001" })).resolves.toBeNull();
    await expect(service.getBinding({ shipmentRef: "SHIP-001" })).resolves.toBeNull();
    await expect(service.listAlerts({ shipmentRef: "SHIP-001" })).resolves.toEqual([]);
    await expect(
      service.listSnapshots({ shipmentRef: "SHIP-001", window: "7d" }),
    ).resolves.toEqual([]);
  });
});
