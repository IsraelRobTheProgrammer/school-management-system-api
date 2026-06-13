import { Role, Plan } from "@prisma/client";
import { RequestHandler } from "express";
import { Router, RouterOptions } from "express";

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by auth.middleware after JWT verification.
       * Contains the decoded token payload.
       */
      user?: {
        userId: string;
        email: string;
        role: Role;
        schoolId: string | null;
        plan: Plan | null;
      };

      /**
       * Set by tenant.middleware after auth.middleware runs.
       * Every request from a school user will have this populated.
       * SUPER_ADMIN requests will not have this set.
       */
      schoolId?: string;

      /**
       * Set by tenant.middleware. Mirrors the school's current plan
       * so plan.guard can check it without another DB call.
       */
      plan?: Plan;
    }
  }
}

// Reusable utility type for any Express controller object
export type Controller = Record<string, RequestHandler>;

/**
 * Factory function to create explicitly typed Express routers.
 * This satisfies the TypeScript declaration emitter
 */
export const createRouter = (options?: RouterOptions): Router => {
  return Router(options);
};
export {};
