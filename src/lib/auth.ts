// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";
import { userRole } from "../types/user.type";

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // Use true for port 465, false for port 587
//   auth: {
//     user: process.env.APP_USER,
//     pass: process.env.APP_PASS,
//   },
// });

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account consent",
      accessType: "offline",
    },
  },

  //   emailVerification: {
  //     sendOnSignUp: true,
  //     sendOnSignIn: false,
  //     autoSignInAfterVerification: true,
  //     sendVerificationEmail: async ({ user, token }) => {
  //       const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  //       const appName = "Prisma Blog App";
  //       const userName = user.name || user.email.split("@")[0] || "";
  //       const currentYear = new Date().getFullYear();

  //       const html = `
  //                     <!DOCTYPE html>
  //                     <html lang="en">
  //                     <head>
  //                       <meta charset="UTF-8">
  //                       <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //                       <title>Verify Your Email Address</title>
  //                     </head>
  //                     <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  //                       <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
  //                         <!-- Header -->
  //                         <tr>
  //                           <td align="center" bgcolor="#ffffff" style="padding: 40px 20px; border-bottom: 1px solid #eeeeee;">
  //                             <h1 style="margin: 0; font-size: 24px; color: #333333;">${appName}</h1>
  //                           </td>
  //                         </tr>

  //                         <!-- Body -->
  //                         <tr>
  //                           <td bgcolor="#ffffff" style="padding: 40px 30px; text-align: center;">
  //                             <h2 style="font-size: 28px; margin: 0 0 20px; color: #333333;">Verify Your Email Address</h2>
  //                             <p style="font-size: 16px; line-height: 24px; color: #666666; margin: 0 0 30px;">
  //                               Hello${userName ? `, ${userName}` : ""}!<br><br>
  //                               Thanks for signing up! To complete your registration and secure your account, please verify your email address by clicking the button below.
  //                             </p>

  //                             <!-- CTA Button -->
  //                             <table border="0" cellpadding="0" cellspacing="0" align="center">
  //                               <tr>
  //                                 <td align="center" bgcolor="#007bff" style="border-radius: 6px;">
  //                                   <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 18px; color: #ffffff; text-decoration: none; border-radius: 6px;">
  //                                     Verify Email Address
  //                                   </a>
  //                                 </td>
  //                               </tr>
  //                             </table>

  //                             <p style="font-size: 14px; line-height: 22px; color: #999999; margin: 30px 0 0;">
  //                               If the button doesn't work, copy and paste this link into your browser:<br>
  //                               <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
  //                             </p>
  //                           </td>
  //                         </tr>

  //                         <!-- Footer -->
  //                         <tr>
  //                           <td bgcolor="#f4f4f4" style="padding: 30px; text-align: center; font-size: 14px; color: #999999;">
  //                             <p style="margin: 0 0 10px;">
  //                               If you didn't sign up for ${appName}, you can safely ignore this email.
  //                             </p>
  //                             <p style="margin: 0;">
  //                               &copy; ${currentYear} ${appName}. All rights reserved.<br>
  //                               Your App Address, City, Country
  //                             </p>
  //                           </td>
  //                         </tr>
  //                       </table>
  //                     </body>
  //                     </html>`;

  //       await transporter.sendMail({
  //         from: `"${appName}" <${process.env.APP_USER}>`,
  //         to: user.email,
  //         subject: "Verify Your Email Address",
  //         text: `Hello! Please verify your email by visiting: ${verificationUrl}\n\nIf you didn't create an account, ignore this email.`,
  //         html,
  //       });

  //       console.log("Verification email sent to:", user.email);
  //     },
  //   },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: userRole.STUDENT,
        required: true,
      },
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});
