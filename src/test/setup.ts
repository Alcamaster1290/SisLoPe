import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.stubEnv("VITE_DATA_TRADE_API_URL", "http://localhost:8788");
