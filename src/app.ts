// src/app.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { TutorRoutes } from "./modules/tutor/tutor.router";
import { auth } from "./lib/auth";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/tutor", TutorRoutes);

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/", (req, res) => {
  res.send("Hello prisma-blog-app!");
});
// app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

export default app;
