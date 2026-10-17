import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { registerRoutes } from "../routes";

const router: IRouter = Router();

router.use(healthRouter);
// Legacy endpoints already include /api. Mount this router without another prefix.
await registerRoutes(router as unknown as import("express").Express);

export default router;
