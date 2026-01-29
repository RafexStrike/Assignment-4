// src/modules/tutor/tutor.router.ts
import { Router } from "express";
import { TutorController } from "./tutor.controller";
import auth from "../../middleware/auth.middleware";
import { userRole } from "../../types/user.type";

const router = Router();

// Apply TUTOR role check to all routes
router.use(auth(userRole.TUTOR));

// Profile routes
router.post("/profile", TutorController.createProfile);
router.get("/profile", TutorController.getProfile);
router.put("/profile", TutorController.updateProfile);

// Availability routes
router.get("/availability", TutorController.getAvailability);
router.post("/availability", TutorController.addAvailability);     // Add single slot
router.put("/availability", TutorController.setAvailability);      // Bulk update all slots
router.delete("/availability/:id", TutorController.deleteAvailability);

export const TutorRoutes = router;