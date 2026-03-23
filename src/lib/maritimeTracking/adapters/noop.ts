import type { MaritimeTrackingReadService } from "@/lib/maritimeTracking/service";

export function createNoopMaritimeTrackingReadService(): MaritimeTrackingReadService {
  return {
    async getShipmentSummary() {
      return null;
    },
    async getLatestSnapshot() {
      return null;
    },
    async listSnapshots() {
      return [];
    },
    async listAlerts() {
      return [];
    },
    async getBinding() {
      return null;
    },
  };
}

export const noopMaritimeTrackingReadService = createNoopMaritimeTrackingReadService();
