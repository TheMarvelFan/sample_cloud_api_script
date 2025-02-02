import { Router } from "express";
import { validateWebhook } from "../controllers/webhook.controller.js";
import { sendOrReceiveMessage } from "../controllers/webhook.controller.js";

const router = Router();

router.route("/").get(validateWebhook).post(sendOrReceiveMessage);

export default router;
