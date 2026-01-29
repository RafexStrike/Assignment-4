// src/app.ts
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import cors from "cors";
import { TutorRoutes } from "./modules/tutor/tutor.router";

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

app.get("/", (req, res) => {
  res.send("SkillBridge API is running!");
});

export default app;
