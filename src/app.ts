// src/app.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";
import { TutorRoutes } from "./modules/tutor/tutor.router";
import { PublicRoutes } from "./modules/public/public.routes";
import { BookingRoutes } from "./modules/booking/booking.routes";
import { ReviewRoutes } from "./modules/review/review.routes";
import { AdminRoutes } from "./modules/admin/admin.routes";

const app = express();

app.use(
  cors({
    origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/api/tutor", TutorRoutes);
app.use("/api/tutors", PublicRoutes);
app.use("/api/bookings", BookingRoutes);
app.use("/api/reviews", ReviewRoutes);
app.use("/api/admin", AdminRoutes);

app.get("/", (req, res) => {
  res.send("SkillBridge API is running!");
});

export default app;
