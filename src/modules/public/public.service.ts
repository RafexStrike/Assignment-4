// src/modules/public/public.service.ts

import { prisma } from "../../lib/prisma.js";

export interface TutorFilters {
  page?: number | undefined;
  limit?: number | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  search?: string | undefined;
  sortBy?: "rating" | "price" | "newest" | undefined;
}

export const PublicService = {
  async getTutors(filters: TutorFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by name or bio
    if (filters.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { bio: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Filter by category/subject
    if (filters.categoryId) {
      where.categories = { some: { id: filters.categoryId } };
    }

    // Filter by price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.hourlyRate = {};
      if (filters.minPrice !== undefined)
        where.hourlyRate.gte = filters.minPrice;
      if (filters.maxPrice !== undefined)
        where.hourlyRate.lte = filters.maxPrice;
    }

    // Filter by minimum rating
    if (filters.minRating) {
      where.rating = { gte: filters.minRating };
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    if (filters.sortBy === "rating") orderBy = { rating: "desc" };
    if (filters.sortBy === "price") orderBy = { hourlyRate: "asc" };

    const [tutors, total] = await Promise.all([
      prisma.tutorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          categories: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.tutorProfile.count({ where }),
    ]);

    return {
      tutors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getTutorById(tutorId: string) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        categories: true,
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        _count: { select: { reviews: true, bookings: true } },
      },
    });

    if (!tutor) throw new Error("Tutor not found");
    return tutor;
  },

  async getCategories() {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  },
};
