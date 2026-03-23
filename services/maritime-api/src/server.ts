import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = await buildApp({ env });

try {
  await app.listen({
    host: "0.0.0.0",
    port: env.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

