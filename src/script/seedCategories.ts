// src/script/seedCategories.ts
import { prisma } from "../lib/prisma.js";

const SUBJECTS = [
  { name: "Mathematics", description: "Algebra, Calculus, and Geometry" },
  { name: "Physics", description: "Classical Mechanics and Quantum Physics" },
  { name: "Chemistry", description: "Organic and Inorganic Chemistry" },
  {
    name: "Computer Science",
    description: "Data Structures, Algorithms, and Web Dev",
  },
  { name: "English Literature", description: "Classic and Modern Literature" },
  { name: "Biology", description: "Genetics, Anatomy, and Ecology" },
  { name: "Economics", description: "Micro and Macroeconomics" },
];

async function seedCategories() {
  console.log("Starting category seeding...");

  try {
    for (const subject of SUBJECTS) {
      const category = await prisma.category.upsert({
        where: { name: subject.name },
        update: {},
        create: {
          name: subject.name,
          description: subject.description,
        },
      });
      console.log(`Seeded subject: ${category.name}`);
    }

    console.log("******* CATEGORY SEEDING COMPLETE ******");
  } catch (error: any) {
    console.error("Error seeding categories:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
