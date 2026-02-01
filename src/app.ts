// src/app.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import cors from "cors";
import { TutorRoutes } from "./modules/tutor/tutor.router.js";
import { PublicRoutes } from "./modules/public/public.routes.js";
import { BookingRoutes } from "./modules/booking/booking.routes.js";
import { ReviewRoutes } from "./modules/review/review.routes.js";
import { AdminRoutes } from "./modules/admin/admin.routes.js";

const app = express();

console.log("\n========== APP INITIALIZATION ==========");
console.log("[APP] BETTER_AUTH_URL:", process.env.BETTER_AUTH_URL);
console.log(
  "[APP] CORS Origin:",
  process.env.BETTER_AUTH_URL || "http://localhost:3000",
);
console.log("========================================\n");

app.use(
  cors({
    origin: [
      "https://assignment-4-frontend-ten.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

app.use((req, res, next) => {
  console.log("\n[REQUEST RECEIVED]");
  console.log("[REQ] Method:", req.method);
  console.log("[REQ] Path:", req.path);
  console.log("[REQ] Origin:", req.get("origin"));
  console.log("[REQ] Cookies present:", !!req.headers.cookie);
  if (req.headers.cookie) {
    console.log(
      "[REQ] Cookie header:",
      req.headers.cookie.substring(0, 100) + "...",
    );
  }
  next();
});

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
