// src/modules/booking/booking.service.ts
import { prisma } from "../../lib/prisma.js";
// import { BookingStatus } from "../../../generated/prisma/client";
import { BookingStatus } from "../../generated/prisma/enums.js";

export interface CreateBookingInput {
  tutorId: string;
  subject: string;
  startAt: string; // ISO date string
  endAt: string; // ISO date string
  notes?: string;
}

export const BookingService = {
  async createBooking(studentId: string, data: CreateBookingInput) {
    // 1. Validate tutor exists and is not the student
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: data.tutorId },
      include: { user: true },
    });

    if (!tutor) throw new Error("Tutor not found");
    if (tutor.userId === studentId) throw new Error("Cannot book yourself");

    // 2. Validate dates
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);
    const now = new Date();

    if (startAt < now) throw new Error("Cannot book sessions in the past");
    if (endAt <= startAt) throw new Error("End time must be after start time");

    // Max duration 3 hours
    const durationHours =
      (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    if (durationHours > 3) throw new Error("Session cannot exceed 3 hours");
    if (durationHours < 0.5)
      throw new Error("Session must be at least 30 minutes");

    // 3. Check for double booking (tutor already booked)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        tutorId: data.tutorId,
        status: { not: "CANCELLED" },
        OR: [
          {
            startAt: { lte: startAt },
            endAt: { gt: startAt },
          },
          {
            startAt: { lt: endAt },
            endAt: { gte: endAt },
          },
        ],
      },
    });

    if (existingBooking) throw new Error("Tutor is not available at this time");

    // 4. Check tutor's recurring availability (optional but recommended)
    const dayOfWeek = startAt.getDay(); // 0-6
    // const timeStr = startAt.toISOString().slice(11, 16);
    // const endTimeStr = endAt.toISOString().slice(11, 16);
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

    const availabilitySlot = await prisma.availabilitySlot.findFirst({
      where: {
        tutorId: data.tutorId,
        dayOfWeek: dayOfWeek,
        startTime: { lte: timeStr },
        endTime: { gte: endTimeStr },
      },
    });

    if (!availabilitySlot) {
      throw new Error("Tutor is not available at this time slot");
    }

    // 5. Calculate price
    const hours = durationHours;
    const price = tutor.hourlyRate ? tutor.hourlyRate * hours : 0;

    // 6. Create booking
    return await prisma.booking.create({
      data: {
        studentId,
        tutorId: data.tutorId,
        subject: data.subject,
        // notes: data.notes,
        notes: data.notes ?? null,
        startAt,
        endAt,
        price,
        status: "CONFIRMED",
      },
      include: {
        tutor: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });
  },

  async getMyBookings(
    userId: string,
    userRole: "STUDENT" | "TUTOR",
    status?: string,
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

    return await prisma.booking.findMany({
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
        review: { select: { id: true, rating: true } }, // To check if reviewed
      },
    });
  },

  async getBookingById(
    userId: string,
    bookingId: string,
    userRole: "STUDENT" | "TUTOR",
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tutor: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
        review: true,
      },
    });

    if (!booking) throw new Error("Booking not found");

    // Authorization check
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
    userRole: "STUDENT" | "TUTOR",
  ) {
    const booking = await this.getBookingById(userId, bookingId, userRole);

    if (booking.status === "CANCELLED")
      throw new Error("Booking already cancelled");
    if (booking.status === "COMPLETED")
      throw new Error("Cannot cancel completed booking");

    // Students can only cancel confirmed bookings
    if (userRole === "STUDENT" && booking.status !== "CONFIRMED") {
      throw new Error("Cannot cancel this booking");
    }

    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        student: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // For tutor to mark as completed
  async completeBooking(tutorUserId: string, bookingId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!profile) throw new Error("Tutor profile not found");

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, tutorId: profile.id },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "CONFIRMED")
      throw new Error("Can only complete confirmed bookings");

    // Ensure session time has passed
    if (new Date() < booking.endAt) {
      throw new Error("Cannot complete booking before end time");
    }

    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    });
  },
};
