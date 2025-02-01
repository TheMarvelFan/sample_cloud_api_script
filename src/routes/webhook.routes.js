import { Router } from "express";

const router = Router();

router.route("/webhook").get(validateWebhook).post(sendOrReceiveMessage);

export {

};
