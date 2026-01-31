// src/script/seedAdmin.ts
import { prisma } from "../lib/prisma.js";
// import { userRole } from "../middleware/auth.middleware";
import { userRole } from "../types/user.type.js";

async function seedAdmin() {
  try {
    // check if the user already exist in the database or not
    const adminData = {
      name: "Skillbridge Admin",
      email: "admin@skillbridge.com",
      role: userRole.ADMIN,
      //   role: "ADMIN",
      password: "admin1234",
    };
    const existingUser = await prisma.user.findUnique({
      where: {
        email: adminData.email,
      },
    });

    if (existingUser) {
      throw new Error("User already exists!");
    }

    const signUpAdmin = await fetch(
      "http://localhost:5000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:5000",
        },
        body: JSON.stringify(adminData),
      },
    );

    console.log(signUpAdmin);

    if (signUpAdmin.ok) {
      console.log("*** Admin created ***");
      await prisma.user.update({
        where: {
          email: adminData.email,
        },
        data: {
          emailVerified: true,
        },
      });
      console.log("*** Email verification status updated! ***");
    }
    console.log("******* SUCCESS ******");
  } catch (error: any) {
    console.log("error message:", error.message);
  }
}

seedAdmin();
