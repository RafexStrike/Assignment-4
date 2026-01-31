import { Router } from "express";
import { BookingController } from "./booking.controller.js";
import auth from "../../middleware/auth.middleware.js";
import { userRole } from "../../types/user.type.js";

const router = Router();

// All routes require authentication
router.use(auth());

// Student routes
router.post("/", auth(userRole.STUDENT), BookingController.create);

// Both Student and Tutor can view their bookings
router.get("/", BookingController.list);
router.get("/:id", BookingController.getOne);

// Student cancel
router.patch("/:id/cancel", auth(userRole.STUDENT), BookingController.cancel);

// Tutor complete (mark as done)
router.patch("/:id/complete", auth(userRole.TUTOR), BookingController.complete);

export const BookingRoutes = router;