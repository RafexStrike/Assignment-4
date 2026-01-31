// src/modules/review/review.routes.ts

import { Router } from "express";
import { ReviewController } from "./review.controller.js";
import auth from "../../middleware/auth.middleware.js";
import { userRole } from "../../types/user.type.js";

const router = Router();

// Public route - anyone can see reviews for a tutor
router.get("/", ReviewController.listForTutor);

// Protected routes
router.use(auth());

// Student only
router.post("/", auth(userRole.STUDENT), ReviewController.create);
router.get("/my-reviews", auth(userRole.STUDENT), ReviewController.listMyReviews);

export const ReviewRoutes = router;