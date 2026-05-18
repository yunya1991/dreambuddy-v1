import { Router } from "express";
import type { Request, Response } from "express";

export function createRouter(): Router {
  const router = Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "ops-ui", timestamp: new Date().toISOString() });
  });

  return router;
}
