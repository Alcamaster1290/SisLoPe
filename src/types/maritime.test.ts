import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  MaritimeAlert,
  MaritimeShipmentBinding,
  MaritimeShipmentSummary,
  MaritimeTrackingSnapshot,
} from "@/types/maritime";

describe("maritime domain contracts", () => {
  it("keeps the summary contract stable for a future read model", () => {
    const summary: MaritimeShipmentSummary = {
      shipmentRef: "SHIP-001",
      direction: "export",
      shipmentStatus: "in_transit",
      trackingStatus: "ready",
      bindingStatus: "bound",
      vesselName: "ADEX Pioneer",
      imo: "9876543",
      mmsi: "123456789",
      destination: "Callao",
      eta: "2026-03-28T10:30:00Z",
      statusSummary: "En transito hacia Callao",
      lastObservedAt: "2026-03-22T08:00:00Z",
      lastSyncedAt: "2026-03-22T08:05:00Z",
      latestPosition: { lat: -12.0453, lon: -77.0311 },
      alertCount: 1,
    };

    expect(summary.bindingStatus).toBe("bound");
    expectTypeOf(summary.latestPosition).toEqualTypeOf<{ lat: number; lon: number } | null>();
  });

  it("supports compact snapshot, alert and binding records", () => {
    const snapshot: MaritimeTrackingSnapshot = {
      shipmentRef: "SHIP-001",
      vesselName: "ADEX Pioneer",
      observedAt: "2026-03-22T08:00:00Z",
      position: { lat: -12.0453, lon: -77.0311 },
      destination: "Callao",
      destinationPortCode: "PECLL",
      destinationPortName: "Puerto del Callao",
      eta: "2026-03-28T10:30:00Z",
      navStatus: "Under way",
      sog: 13.2,
      cog: 182,
      signalFreshness: "fresh",
      statusSummary: "Trayecto estable",
      providerSource: "provider-x",
    };
    const alert: MaritimeAlert = {
      id: "alert-1",
      shipmentRef: "SHIP-001",
      type: "eta_change",
      severity: "warning",
      state: "open",
      title: "ETA actualizado",
      message: "El ETA se movio 4 horas respecto al ultimo snapshot.",
      detectedAt: "2026-03-22T08:10:00Z",
      resolvedAt: null,
    };
    const binding: MaritimeShipmentBinding = {
      shipmentRef: "SHIP-001",
      status: "bound",
      vesselName: "ADEX Pioneer",
      imo: "9876543",
      mmsi: "123456789",
      source: "manual",
      confidence: 0.92,
      updatedAt: "2026-03-22T08:00:00Z",
    };

    expect(snapshot.providerSource).toBe("provider-x");
    expect(alert.state).toBe("open");
    expect(binding.status).toBe("bound");
  });
});
