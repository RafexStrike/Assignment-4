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
      // console.log(roles);
      // get user session
      const session = await authVariableDefinedInAuthDotTsFile.api.getSession({
        headers: req.headers as any,
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "You are not authrized.",
        });
      }

      if (!session.user.emailVerified) {
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

      if (roles.length && !roles.includes(req.user.role as userRole)) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden. You don't have the permission to access this resource!",
        });
      }

      next();
    } catch (error) {
      console.log(
        "Sorry there has been an error in the auth middleware:",
        error,
      );
      next(error);
    }
  };
};

export default auth;
