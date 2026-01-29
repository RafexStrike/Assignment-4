// src/modules/admin/admin.routes.ts


import { Router } from "express";
import { AdminController } from "./admin.controller";
import auth from "../../middleware/auth.middleware";
import { userRole } from "../../types/user.type";

const router = Router();

// Apply ADMIN role check to all routes
router.use(auth(userRole.ADMIN));

// Dashboard
router.get("/dashboard", AdminController.getDashboard);

// User Management
router.get("/users", AdminController.listUsers);
router.get("/users/:id", AdminController.getUser);
router.patch("/users/:id/ban", AdminController.banUser);

// Booking Oversight
router.get("/bookings", AdminController.listBookings);
router.patch("/bookings/:id/cancel", AdminController.cancelBooking);

// Category Management
router.get("/categories", AdminController.listCategories);
router.post("/categories", AdminController.createCategory);
router.put("/categories/:id", AdminController.updateCategory);
router.delete("/categories/:id", AdminController.deleteCategory);

// Featured Tutor Management
router.get("/featured-tutors", AdminController.getFeatured);
router.patch("/tutors/:id/featured", AdminController.toggleFeatured);

export const AdminRoutes = router;