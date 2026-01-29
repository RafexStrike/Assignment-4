// src/modules/admin/admin.service.ts

import { prisma } from "../../lib/prisma";

export interface BanUserInput {
  isBanned: boolean;
  reason?: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
}

export const AdminService = {
  //  Dashboard Analytics

  async getDashboardStats() {
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      activeUsers,
      bannedUsers,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      recentUsers,
      recentBookings,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TUTOR" } }),
      prisma.user.count({ where: { isBanned: false } }),
      prisma.user.count({ where: { isBanned: true } }),

      // Booking counts by status
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),

      // Revenue from completed bookings
      prisma.booking.aggregate({
        where: { status: "COMPLETED" },
        _sum: { price: true },
      }),

      // Recent activity (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        students: totalStudents,
        tutors: totalTutors,
        active: activeUsers,
        banned: bannedUsers,
      },
      bookings: {
        total: totalBookings,
        confirmed: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      revenue: totalRevenue._sum.price || 0,
      recentActivity: {
        newUsers: recentUsers,
        newBookings: recentBookings,
      },
    };
  },

  //  User Management

  async getAllUsers(options: {
    page?: number;
    limit?: number;
    role?: "STUDENT" | "TUTOR" | "ADMIN";
    isBanned?: boolean;
    search?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.role) where.role = options.role;
    if (options.isBanned !== undefined) where.isBanned = options.isBanned;

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isBanned: true,
          banReason: true,
          createdAt: true,
          updatedAt: true,
          image: true,
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // If tutor, include profile summary
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        if (user.role === "TUTOR") {
          const profile = await prisma.tutorProfile.findUnique({
            where: { userId: user.id },
            select: {
              id: true,
              rating: true,
              hourlyRate: true,
              isFeatured: true,
              _count: {
                select: { bookings: true, reviews: true },
              },
            },
          });
          return { ...user, tutorProfile: profile };
        }
        return user;
      }),
    );

    return {
      users: usersWithProfiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            tutor: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            review: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            tutor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
        tutorProfile: {
          include: {
            categories: true,
            availability: true,
            _count: {
              select: { bookings: true, reviews: true },
            },
          },
        },
      },
    });

    if (!user) throw new Error("User not found");
    return user;
  },

  async toggleUserBan(userId: string, data: BanUserInput) {
    // Prevent banning yourself or other admins (safety check)
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isBanned: true },
    });

    if (!targetUser) throw new Error("User not found");
    if (targetUser.role === "ADMIN")
      throw new Error("Cannot ban administrators");

    // If banning, require reason
    if (data.isBanned && !data.reason) {
      throw new Error("Ban reason is required");
    }

    return await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: data.isBanned,
        // banReason: data.isBanned ? data.reason : null,
        banReason: data.isBanned ? (data.reason ?? null) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
      },
    });
  },

  //  Booking Oversight

  async getAllBookings(options: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    tutorId?: string;
    studentId?: string;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.status && options.status !== "ALL") {
      where.status = options.status;
    }
    if (options.tutorId) where.tutorId = options.tutorId;
    if (options.studentId) where.studentId = options.studentId;

    if (options.startDate || options.endDate) {
      where.startAt = {};
      if (options.startDate) where.startAt.gte = new Date(options.startDate);
      if (options.endDate) where.startAt.lte = new Date(options.endDate);
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { id: true, name: true, email: true, image: true },
          },
          tutor: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          review: true,
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async adminCancelBooking(bookingId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.status === "CANCELLED")
      throw new Error("Booking already cancelled");
    if (booking.status === "COMPLETED")
      throw new Error("Cannot cancel completed booking");

    return await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        // Note: We could add an adminNotes field to Booking schema if we want to store cancel reason
      },
      include: {
        student: { select: { name: true, email: true } },
        tutor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  },

  //  Category Management

  async getCategoriesWithStats() {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { tutors: true },
        },
      },
    });

    return categories.map((cat) => ({
      ...cat,
      tutorCount: cat._count.tutors,
    }));
  },

  async createCategory(data: CategoryInput) {
    // Check for duplicate name
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) throw new Error("Category with this name already exists");

    return await prisma.category.create({
      data: {
        name: data.name,
        // description: data.description,
        description: data.description ?? null,
      },
    });
  },

  async updateCategory(categoryId: string, data: CategoryInput) {
    // Check if new name conflicts with other categories
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: data.name,
          NOT: { id: categoryId },
        },
      });
      if (existing)
        throw new Error("Another category with this name already exists");
    }

    return await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        // description: data.description,
        description: data.description ?? null,
      },
    });
  },

  async deleteCategory(categoryId: string) {
    // Check if category is in use
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { tutors: true } } },
    });

    if (!category) throw new Error("Category not found");
    if (category._count.tutors > 0) {
      throw new Error(
        `Cannot delete category. It is being used by ${category._count.tutors} tutor(s). Please reassign tutors first.`,
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: "Category deleted successfully" };
  },

  //  Featured Tutor Management

  async toggleFeaturedTutor(tutorProfileId: string) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
      include: { user: true },
    });

    if (!tutor) throw new Error("Tutor profile not found");
    if (tutor.user.isBanned) throw new Error("Cannot feature a banned tutor");

    const updated = await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: { isFeatured: !tutor.isFeatured },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        categories: true,
      },
    });

    return {
      ...updated,
      action: updated.isFeatured ? "featured" : "unfeatured",
    };
  },

  async getFeaturedTutors() {
    return await prisma.tutorProfile.findMany({
      where: { isFeatured: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        categories: true,
        _count: {
          select: { reviews: true, bookings: true },
        },
      },
      orderBy: { rating: "desc" },
    });
  },
};
