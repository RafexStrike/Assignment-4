// src/modules/review/review.controller.ts

import { Request, Response } from "express";
import { ReviewService } from "./review.service.js";

export const ReviewController = {
  async create(req: Request, res: Response) {
    try {
      const studentId = req.user!.id;
      const review = await ReviewService.createReview(studentId, req.body);

      res.status(201).json({
        success: true,
        message: "Review submitted successfully",
        data: review,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  async listForTutor(req: Request, res: Response) {
    try {
      const { tutorId } = req.query;
      if (!tutorId) {
        return res.status(400).json({
          success: false,
          message: "tutorId query parameter required",
        });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await ReviewService.getTutorReviews(
        tutorId as string,
        page,
        limit,
      );

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async listMyReviews(req: Request, res: Response) {
    try {
      const studentId = req.user!.id;
      const reviews = await ReviewService.getMyReviews(studentId);

      res.json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};
