// src/modules/booking/booking.controller.ts
import { Request, Response } from "express";
import { BookingService } from "./booking.service.js";

export const BookingController = {
  async create(req: Request, res: Response) {
    try {
      const studentId = req.user!.id;
      const booking = await BookingService.createBooking(studentId, req.body);
      
      res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const role = req.user!.role as 'STUDENT' | 'TUTOR';
      const status = req.query.status as string;
      
      const bookings = await BookingService.getMyBookings(userId, role, status);
      
      // Group by status for frontend convenience
      const grouped = {
        upcoming: bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startAt) > new Date()),
        past: bookings.filter(b => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.startAt) <= new Date())),
        cancelled: bookings.filter(b => b.status === 'CANCELLED')
      };

      res.json({
        success: true,
        count: bookings.length,
        data: role === 'STUDENT' ? grouped : bookings // Group for students, flat for tutors
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  async getOne(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const role = req.user!.role as 'STUDENT' | 'TUTOR';
      const bookingId = req.params.id as string;
      
      const booking = await BookingService.getBookingById(userId, bookingId, role);
      
      res.json({
        success: true,
        data: booking
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const role = req.user!.role as 'STUDENT' | 'TUTOR';
      const bookingId = req.params.id as string;
      
      const booking = await BookingService.cancelBooking(userId, bookingId, role);
      
      res.json({
        success: true,
        message: "Booking cancelled successfully",
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // For tutors to mark complete
  async complete(req: Request, res: Response) {
    try {
      const tutorUserId = req.user!.id;
      const bookingId = req.params.id as string;
      
      const booking = await BookingService.completeBooking(tutorUserId, bookingId);
      
      res.json({
        success: true,
        message: "Booking marked as completed",
        data: booking
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
};