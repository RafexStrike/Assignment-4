// src/modules/admin/admin.controller.ts

import { Request, Response } from "express";
import { AdminService } from "./admin.service.js";

export const AdminController = {
  //  Dashboard 

  async getDashboard(req: Request, res: Response) {
    try {
      const stats = await AdminService.getDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  //  Users 

  async listUsers(req: Request, res: Response) {
    try {
      //   const options = {
      //     page: req.query.page ? parseInt(req.query.page as string) : undefined,
      //     limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      //     role: req.query.role as any,
      //     isBanned: req.query.isBanned === 'true' ? true :
      //               req.query.isBanned === 'false' ? false : undefined,
      //     search: req.query.search as string
      //   };
      const { page, limit, role, isBanned, search } = req.query;

      // Use the spread operator to only include keys that have values
      const options = {
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) }),
        ...(role && { role: role as any }),
        ...(isBanned !== undefined && {
          isBanned: isBanned === "true",
        }),
        ...(search && { search: search as string }),
      };

      const result = await AdminService.getAllUsers(options);

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getUser(req: Request, res: Response) {
    try {
      const id = req.params.id as any;
      const user = await AdminService.getUserDetails(id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  },

  async banUser(req: Request, res: Response) {
    try {
      const id = req.params.id as any;
      const { isBanned, reason } = req.body;

      const user = await AdminService.toggleUserBan(id, { isBanned, reason });

      res.json({
        success: true,
        message: `User ${isBanned ? "banned" : "unbanned"} successfully`,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  //  Bookings 

  async listBookings(req: Request, res: Response) {
    try {
      //   const options = {
      //     page: req.query.page ? parseInt(req.query.page as string) : undefined,
      //     limit: req.query.limit
      //       ? parseInt(req.query.limit as string)
      //       : undefined,
      //     status: req.query.status as string,
      //     startDate: req.query.startDate as string,
      //     endDate: req.query.endDate as string,
      //     tutorId: req.query.tutorId as string,
      //     studentId: req.query.studentId as string,
      //   };

      const { page, limit, status, startDate, endDate, tutorId, studentId } =
        req.query;

      // Use the spread operator to only include keys that have values
      const options = {
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) }),
        ...(status && { status: status as string }),
        ...(startDate && { startDate: startDate as string }),
        ...(endDate && { endDate: endDate as string }),
        ...(tutorId && { tutorId: tutorId as string }),
        ...(studentId && { studentId: studentId as string }),
      };

      const result = await AdminService.getAllBookings(options);

      res.json({
        success: true,
        data: result.bookings,
        pagination: result.pagination,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async cancelBooking(req: Request, res: Response) {
    try {
      const id = req.params.id as any;
      const { reason } = req.body;

      const booking = await AdminService.adminCancelBooking(id, reason);

      res.json({
        success: true,
        message: "Booking cancelled by admin",
        data: booking,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  //  Categories 

  async listCategories(req: Request, res: Response) {
    try {
      const categories = await AdminService.getCategoriesWithStats();

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

  async createCategory(req: Request, res: Response) {
    try {
      const category = await AdminService.createCategory(req.body);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  async updateCategory(req: Request, res: Response) {
    try {
      const id = req.params.id as any;
      const category = await AdminService.updateCategory(id, req.body);

      res.json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    try {
      //   const { id } = req.params;
      const id = req.params.id as any;
      const result = await AdminService.deleteCategory(id);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  //  Featured Tutors 

  async toggleFeatured(req: Request, res: Response) {
    try {
      //   const { id } = req.params;
      const id = req.params.id as any;
      const result = await AdminService.toggleFeaturedTutor(id);

      res.json({
        success: true,
        message: `Tutor ${result.action} successfully`,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getFeatured(req: Request, res: Response) {
    try {
      const tutors = await AdminService.getFeaturedTutors();

      res.json({
        success: true,
        count: tutors.length,
        data: tutors,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};
