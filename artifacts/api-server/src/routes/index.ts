import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import animeRouter from "./anime";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(animeRouter);

export default router;
