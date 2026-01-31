// src/modules/tutor/tutor.service.ts
import { prisma } from "../../lib/prisma.js";

export interface CreateTutorProfileInput {
  bio?: string;
  education: string; // Required per your spec
  hourlyRate?: number;
  subjectIds: string[]; // Category IDs (subjects they teach)
}

export interface UpdateTutorProfileInput {
  bio?: string;
  education?: string;
  hourlyRate?: number;
  subjectIds?: string[];
}

export interface AvailabilitySlotInput {
  dayOfWeek: number; // 0-6
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export const TutorService = {
  // Create tutor profile (education, subjects/categories)
  async createTutorProfile(userId: string, data: CreateTutorProfileInput) {
    // Check if user already has a tutor profile
    const existing = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new Error("Tutor profile already exists for this user");
    }

    // Validate subjectIds exist
    if (data.subjectIds?.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: data.subjectIds } },
      });
      if (categories.length !== data.subjectIds.length) {
        throw new Error("One or more subject IDs are invalid");
      }
    }

    const profile = await prisma.tutorProfile.create({
      data: {
        userId,
        bio: data.bio,
        education: data.education,
        hourlyRate: data.hourlyRate,
        categories: {
          connect: data.subjectIds?.map((id) => ({ id })) || [],
        },
      } as any,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        categories: true,
        _count: {
          select: { bookings: true, reviews: true },
        },
      },
    });

    return profile;
  },

  // Get tutor profile by userId
  async getTutorProfile(userId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        categories: true,
        availability: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
        _count: {
          select: { bookings: true, reviews: true },
        },
      },
    });

    if (!profile) {
      throw new Error("Tutor profile not found");
    }

    return profile;
  },

  // Update profile (education, subjects, etc.)
  async updateTutorProfile(userId: string, data: UpdateTutorProfileInput) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Tutor profile not found");
    }

    const updateData: any = {
      bio: data.bio,
      education: data.education,
      hourlyRate: data.hourlyRate,
    };

    // Handle subjects/categories update
    if (data.subjectIds !== undefined) {
      updateData.categories = {
        set: data.subjectIds.map((id) => ({ id })),
      };
    }

    const updated = await prisma.tutorProfile.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        categories: true,
      },
    });

    return updated;
  },

  // Add single availability slot
  async addAvailabilitySlot(userId: string, slot: AvailabilitySlotInput) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Tutor profile not found");
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
      throw new Error("Invalid time format. Use HH:mm (24-hour format)");
    }

    // Validate day of week
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      throw new Error("Invalid day of week. Use 0-6 (Sunday-Saturday)");
    }

    // Check for overlapping slots
    const conflicting = await prisma.availabilitySlot.findFirst({
      where: {
        tutorId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        OR: [
          {
            // New slot starts during existing slot
            startTime: { lte: slot.startTime },
            endTime: { gt: slot.startTime },
          },
          {
            // New slot ends during existing slot
            startTime: { lt: slot.endTime },
            endTime: { gte: slot.endTime },
          },
          {
            // New slot completely contains existing slot
            startTime: { gte: slot.startTime },
            endTime: { lte: slot.endTime },
          },
        ],
      },
    });

    if (conflicting) {
      throw new Error("This time slot conflicts with existing availability");
    }

    return await prisma.availabilitySlot.create({
      data: {
        tutorId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
  },

  // Set availability (bulk replace - deletes old, creates new)
  async setAvailability(userId: string, slots: AvailabilitySlotInput[]) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Tutor profile not found");
    }

    // Validate all slots first
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const slot of slots) {
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        throw new Error(
          `Invalid time format: ${slot.startTime} - ${slot.endTime}`,
        );
      }
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new Error(`Invalid day: ${slot.dayOfWeek}`);
      }
      if (slot.startTime >= slot.endTime) {
        throw new Error(
          `Start time must be before end time: ${slot.startTime} - ${slot.endTime}`,
        );
      }
    }

    // Transaction: delete all existing, create new ones
    await prisma.$transaction(async (tx) => {
      // Delete existing slots
      await tx.availabilitySlot.deleteMany({
        where: { tutorId: profile.id },
      });

      // Create new slots in bulk
      if (slots.length > 0) {
        await tx.availabilitySlot.createMany({
          data: slots.map((slot) => ({
            tutorId: profile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
          skipDuplicates: true, // In case of exact duplicates in input
        });
      }
    });

    return await prisma.availabilitySlot.findMany({
      where: { tutorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  },

  // Get all availability slots
  async getAvailability(userId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    // if (!profile) {
    //   throw new Error("Tutor profile not found");
    // }
    if (!profile) {
      return [];
    }

    return await prisma.availabilitySlot.findMany({
      where: { tutorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  },

  // Delete single availability slot
  async deleteAvailabilitySlot(userId: string, slotId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error("Tutor profile not found");
    }

    const slot = await prisma.availabilitySlot.findFirst({
      where: {
        id: slotId,
        tutorId: profile.id,
      },
    });

    if (!slot) {
      throw new Error("Availability slot not found or unauthorized");
    }

    await prisma.availabilitySlot.delete({
      where: { id: slotId },
    });

    return { message: "Slot deleted successfully" };
  },
};
