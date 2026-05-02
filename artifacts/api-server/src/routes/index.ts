import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import animeRouter from "./anime";
import mangaRouter from "./manga";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(animeRouter);
router.use(mangaRouter);
router.use(reviewsRouter);

export default router;
