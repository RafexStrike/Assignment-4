//src/ middleware/auth.middleware.ts
import { NextFunction, Request, Response } from "express";
import { auth as authVariableDefinedInAuthDotTsFile } from "../lib/auth.js";
import { userRole } from "../types/user.type.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        emailVerified: boolean;
      };
    }
  }
}

// the actual middleware
const auth = (...roles: userRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("\n========== AUTH MIDDLEWARE DEBUG ==========");
      console.log("[AUTH] Route:", req.method, req.path);
      console.log("[AUTH] Roles required:", roles);
      console.log("[AUTH] All headers:", JSON.stringify(req.headers, null, 2));
      console.log("[AUTH] Cookie header:", req.headers.cookie);
      console.log("[AUTH] Authorization header:", req.headers.authorization);
      
      // get user session
      console.log("[AUTH] Calling auth.api.getSession with headers...");
      const session = await authVariableDefinedInAuthDotTsFile.api.getSession({
        headers: req.headers as any,
      });

      console.log("[AUTH] Session result:", session ? "✓ Session found" : "✗ No session");
      if (session) {
        console.log("[AUTH] Session user:", {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
          emailVerified: session.user.emailVerified,
        });
      } else {
        console.log("[AUTH] Session is null/undefined - returning 401");
      }

      if (!session) {
        console.log("[AUTH] ✗ UNAUTHORIZED - No valid session");
        console.log("==========================================\n");
        return res.status(401).json({
          success: false,
          message: "You are not authrized.",
        });
      }

      if (!session.user.emailVerified) {
        console.log("[AUTH] ✗ EMAIL NOT VERIFIED");
        console.log("==========================================\n");
        return res.status(403).json({
          success: false,
          message: "Email verification has not been completed.",
        });
      }

      req.user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as string,
        emailVerified: session.user.emailVerified,
      };

      console.log("[AUTH] Checking role authorization...");
      console.log("[AUTH] User role:", req.user.role);
      console.log("[AUTH] Required roles:", roles);

      if (roles.length && !roles.includes(req.user.role as userRole)) {
        console.log("[AUTH] ✗ FORBIDDEN - User doesn't have required role");
        console.log("==========================================\n");
        return res.status(403).json({
          success: false,
          message:
            "Forbidden. You don't have the permission to access this resource!",
        });
      }

      console.log("[AUTH] ✓ AUTHORIZED - User passed all checks");
      console.log("==========================================\n");
      next();
    } catch (error) {
      console.log("\n========== AUTH MIDDLEWARE ERROR ==========");
      console.log("[AUTH] Exception in middleware:", error);
      console.log("==========================================\n");
      next(error);
    }
  };
};

export default auth;
