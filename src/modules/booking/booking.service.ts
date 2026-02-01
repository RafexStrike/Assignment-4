// src/modules/booking/booking.service.ts

import { prisma } from "../../lib/prisma.js";
import { BookingStatus } from "../../generated/prisma/enums.js";

export interface CreateBookingInput {
  tutorId: string;
  subject: string;
  startAt: string; // LOCAL datetime string
  endAt: string;   // LOCAL datetime string
  notes?: string;
}

export const BookingService = {
   async createBooking(studentId: string, data: CreateBookingInput) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: data.tutorId },
      include: { user: true },
    });

    if (!tutor) throw new Error("Tutor not found");
    if (tutor.userId === studentId) throw new Error("Cannot book yourself");

    // LOCAL TIME — DO NOT TOUCH UTC
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    const now = new Date();

    if (startAt < now) throw new Error("Cannot book sessions in the past");
    if (endAt <= startAt) throw new Error("End time must be after start time");

    const durationHours =
      (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);

    if (durationHours > 3) throw new Error("Session cannot exceed 3 hours");
    if (durationHours < 0.5)
      throw new Error("Session must be at least 30 minutes");

    // Check overlap
    const existingBooking = await prisma.booking.findFirst({
      where: {
        tutorId: data.tutorId,
        status: { not: BookingStatus.CANCELLED },
        OR: [
          { startAt: { lte: startAt }, endAt: { gt: startAt } },
          { startAt: { lt: endAt }, endAt: { gte: endAt } },
        ],
      },
    });

    if (existingBooking)
      throw new Error("Tutor is not available at this time");

    //  LOCAL DAY + LOCAL TIME
    const dayOfWeek = startAt.getDay();

    const timeStr = startAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const endTimeStr = endAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    console.log("[BOOKING][TIME CHECK]", {
      startAt,
      endAt,
      dayOfWeek,
      timeStr,
      endTimeStr,
    });

    const availabilitySlot = await prisma.availabilitySlot.findFirst({
      where: {
        tutorId: data.tutorId,
        dayOfWeek,
        startTime: { lte: timeStr },
        endTime: { gte: endTimeStr },
      },
    });

    if (!availabilitySlot)
      throw new Error("Tutor is not available at this time slot");

    const price = tutor.hourlyRate
      ? tutor.hourlyRate * durationHours
      : 0;

    return prisma.booking.create({
      data: {
        studentId,
        tutorId: data.tutorId,
        subject: data.subject,
        notes: data.notes ?? null,
        startAt,
        endAt,
        price,
        status: BookingStatus.CONFIRMED,
      },
    });
  },

  // ============================================================

  async getMyBookings(
    userId: string,
    userRole: "STUDENT" | "TUTOR",
    status?: string
  ) {
    const where: any = {};

    if (userRole === "STUDENT") {
      where.studentId = userId;
    } else {
      const profile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });
      if (!profile) throw new Error("Tutor profile not found");
      where.tutorId = profile.id;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    return prisma.booking.findMany({
      where,
      orderBy: { startAt: "desc" },
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
        review: { select: { id: true, rating: true } },
      },
    });
  },

  async getBookingById(
    userId: string,
    bookingId: string,
    userRole: "STUDENT" | "TUTOR"
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
        review: true,
      },
    });

    if (!booking) throw new Error("Booking not found");

    if (userRole === "STUDENT" && booking.studentId !== userId) {
      throw new Error("Unauthorized");
    }

    if (userRole === "TUTOR") {
      const profile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });
      if (!profile || booking.tutorId !== profile.id) {
        throw new Error("Unauthorized");
      }
    }

    return booking;
  },

  async cancelBooking(
    userId: string,
    bookingId: string,
    userRole: "STUDENT" | "TUTOR"
  ) {
    const booking = await this.getBookingById(
      userId,
      bookingId,
      userRole
    );

    if (booking.status === BookingStatus.CANCELLED)
      throw new Error("Booking already cancelled");

    if (booking.status === BookingStatus.COMPLETED)
      throw new Error("Cannot cancel completed booking");

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  },

  async completeBooking(tutorUserId: string, bookingId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!profile) throw new Error("Tutor profile not found");

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tutorId: profile.id },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.status !== BookingStatus.CONFIRMED)
      throw new Error("Can only complete confirmed bookings");

    if (new Date() < booking.endAt) {
      throw new Error("Cannot complete booking before end time");
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });
  },
};
