import { Router } from "express";
import { challengeController } from "../controllers/challenge.controller";
import { checkInController } from "../controllers/checkin.controller";
import { graduationController } from "../controllers/graduation.controller";
import { mediaController } from "../controllers/media.controller";
import { agentController } from "../controllers/agent.controller";

export const apiRouter = Router();

apiRouter.get("/templates", challengeController.listTemplates);
apiRouter.get("/templates/:templateId/community", challengeController.getCommunity);
apiRouter.get("/templates/:templateId/participants", challengeController.listCommunityParticipants);
apiRouter.get("/session", challengeController.getSession);
apiRouter.get("/feed", challengeController.getFeed);
apiRouter.post("/challenge/start", challengeController.start);
apiRouter.post("/challenge/protocol", challengeController.saveProtocol);
apiRouter.post("/templates/:templateId/clone", challengeController.clone);
apiRouter.post("/feed/:feedItemId/clone", challengeController.cloneFromFeed);
apiRouter.post("/check-ins", checkInController.create);
apiRouter.get("/check-in-jobs/:id", checkInController.getJob);
apiRouter.get("/check-in-jobs/:id/events", checkInController.events);
apiRouter.post("/check-ins/:id/publish", checkInController.publish);
apiRouter.post("/check-ins/:id/feedback", agentController.feedback);
apiRouter.post("/action-cards/:id/complete", agentController.completeActionCard);
apiRouter.post("/media", mediaController.uploadVideo);
apiRouter.post("/challenge/dev-complete", graduationController.complete);
apiRouter.post("/graduate/report", graduationController.report);
apiRouter.post("/graduate/post", graduationController.publish);
