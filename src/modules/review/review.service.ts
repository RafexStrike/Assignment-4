// src/modules/review/review.service.ts

import { prisma } from "../../lib/prisma.js";

export interface CreateReviewInput {
  tutorId: string;
  bookingId: string;
  rating: number;
  comment?: string;
}

export const ReviewService = {
  async createReview(studentId: string, data: CreateReviewInput) {
    // 1. Validate rating
    if (data.rating < 0 || data.rating > 10) {
      throw new Error("Rating must be between 0 and 10");
    }

    // 2. Verify booking exists, belongs to student, is completed, and matches tutor
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        studentId: studentId,
        tutorId: data.tutorId,
        status: "COMPLETED",
      },
    });

    if (!booking) {
      throw new Error("Booking not found or not completed yet");
    }

    // 3. Check if already reviewed
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: data.bookingId },
    });

    if (existingReview) {
      throw new Error("You have already reviewed this session");
    }

    // 4. Create review in transaction and update tutor stats
    const result = await prisma.$transaction(async (tx) => {
      // Create review
      const review = await tx.review.create({
        data: {
          authorId: studentId,
          tutorId: data.tutorId,
          bookingId: data.bookingId,
          rating: data.rating,
          comment: data.comment ?? null,
        },
      });

      // Update tutor rating and count
      const tutorReviews = await tx.review.aggregate({
        where: { tutorId: data.tutorId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.tutorProfile.update({
        where: { id: data.tutorId },
        data: {
          rating: tutorReviews._avg.rating || 0,
          totalReviews: tutorReviews._count.rating,
        },
      });

      return review;
    });

    return result;
  },

  async getTutorReviews(tutorId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { tutorId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.review.count({ where: { tutorId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getMyReviews(studentId: string) {
    return await prisma.review.findMany({
      where: { authorId: studentId },
      orderBy: { createdAt: "desc" },
      include: {
        tutor: {
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        },
        booking: {
          select: { startAt: true, endAt: true, subject: true },
        },
      },
    });
  },
};
