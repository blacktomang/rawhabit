import { Router } from "express";
import { challengeController } from "../controllers/challenge.controller";
import { checkInController } from "../controllers/checkin.controller";
import { graduationController } from "../controllers/graduation.controller";

export const apiRouter = Router();

apiRouter.get("/templates", challengeController.listTemplates);
apiRouter.get("/session", challengeController.getSession);
apiRouter.get("/feed", challengeController.getFeed);
apiRouter.post("/challenge/start", challengeController.start);
apiRouter.post("/templates/:templateId/clone", challengeController.clone);
apiRouter.post("/check-ins", checkInController.create);
apiRouter.post("/challenge/dev-complete", graduationController.complete);
apiRouter.post("/graduate/report", graduationController.report);
apiRouter.post("/graduate/post", graduationController.publish);
