import express from "express";
import { createStripeCheckoutSession, } from "../controllers/payment.js";
import { isAuth } from "../middlewares/isAuth.js";
const router = express.Router();
router.post("/stripe/create", isAuth, createStripeCheckoutSession);
export default router;
