import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import animeRouter from "./anime";
import mangaRouter from "./manga";
import reviewsRouter from "./reviews";
import chatRouter from "./chat";
import reportsRouter from "./reports";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(animeRouter);
router.use(mangaRouter);
router.use(reviewsRouter);
router.use(chatRouter);
router.use(reportsRouter);
router.use(adminRouter);

export default router;
