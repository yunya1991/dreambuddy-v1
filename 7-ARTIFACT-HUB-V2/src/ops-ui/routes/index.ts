import { Router, Request, Response } from "express";
import { renderDashboard } from "../views/dashboard.js";
import { renderHealthCheck } from "../views/health.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderDashboard());
});

router.get("/health", (_req: Request, res: Response) => {
  res.json(renderHealthCheck());
});

export default router;
