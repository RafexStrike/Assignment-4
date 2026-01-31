// src/modules/public/public.controller.ts

import { Request, Response } from "express";
import { PublicService } from "./public.service.js";

export const PublicController = {
  async listTutors(req: Request, res: Response) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        categoryId: req.query.categoryId as string,
        minPrice: req.query.minPrice
          ? parseFloat(req.query.minPrice as string)
          : undefined,
        maxPrice: req.query.maxPrice
          ? parseFloat(req.query.maxPrice as string)
          : undefined,
        minRating: req.query.minRating
          ? parseFloat(req.query.minRating as string)
          : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as "rating" | "price" | "newest",
      };

      const result = await PublicService.getTutors(filters);

      res.json({
        success: true,
        data: result.tutors,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getTutorDetails(req: Request, res: Response) {
    try {
      const id = req.params.id as any;
      const tutor = await PublicService.getTutorById(id);

      res.json({
        success: true,
        data: tutor,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Tutor not found",
      });
    }
  },

  async listCategories(req: Request, res: Response) {
    try {
      const categories = await PublicService.getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};
