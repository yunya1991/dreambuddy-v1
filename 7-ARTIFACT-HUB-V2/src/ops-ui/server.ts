import express from "express";
import { createRouter } from "./routes/index.js";
import type { OpsUIConfig } from "./types.js";

export function createApp(config?: Partial<OpsUIConfig>) {
  const app = express();
  app.use(express.json());
  app.use("/", createRouter());
  return app;
}

export function startServer(config: OpsUIConfig = { port: 3457, artifactHubUrl: "http://127.0.0.1:8787", gatewayUrl: "http://127.0.0.1:3000" }) {
  const app = createApp(config);
  app.listen(config.port, () => {
    console.log(`ops-ui listening on port ${config.port}`);
  });
  return app;
}
