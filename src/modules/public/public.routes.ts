// src/modules/public/public.routes.ts

import { Router } from "express";
import { PublicController } from "./public.controller.js";

const router = Router();

// router.get("/tutors", PublicController.listTutors);
router.get("/getTutors", PublicController.listTutors);
// router.get("/tutors/:id", PublicController.getTutorDetails);
router.get("/getTutors/:id", PublicController.getTutorDetails);
router.get("/categories", PublicController.listCategories);

export const PublicRoutes = router;
