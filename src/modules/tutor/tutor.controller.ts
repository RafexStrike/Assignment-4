// src/modules/tutor/tutor.controller.ts
import { Request, Response } from "express";
import { TutorService } from "./tutor.service.js";

export const TutorController = {
  // POST /api/tutor/profile
  async createProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const profile = await TutorService.createTutorProfile(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Tutor profile created successfully",
        data: profile,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create tutor profile",
      });
    }
  },

  // GET /api/tutor/profile
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const profile = await TutorService.getTutorProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Profile not found",
      });
    }
  },

  // PUT /api/tutor/profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const profile = await TutorService.updateTutorProfile(userId, req.body);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: profile,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update profile",
      });
    }
  },

  // POST /api/tutor/availability - Add single slot
  async addAvailability(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const slot = await TutorService.addAvailabilitySlot(userId, req.body);

      res.status(201).json({
        success: true,
        message: "Availability slot added",
        data: slot,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // PUT /api/tutor/availability - Bulk set/replace all slots
  async setAvailability(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { slots } = req.body; // Expecting { slots: [...] }
      
      if (!Array.isArray(slots)) {
        return res.status(400).json({
          success: false,
          message: "slots must be an array",
        });
      }

      const availability = await TutorService.setAvailability(userId, slots);

      res.json({
        success: true,
        message: "Availability updated successfully",
        data: availability,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  // GET /api/tutor/availability
  async getAvailability(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const slots = await TutorService.getAvailability(userId);

      res.json({
        success: true,
        count: slots.length,
        data: slots,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // DELETE /api/tutor/availability/:id
  async deleteAvailability(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const slotId = req.params.id as string;
      
      await TutorService.deleteAvailabilitySlot(userId, slotId);

      res.json({
        success: true,
        message: "Availability slot deleted",
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  },
};