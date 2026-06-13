import { RequestHandler, Router, RouterOptions } from "express";

// Reusable utility type for any Express controller object
export type Controller = Record<string, RequestHandler>;

/**
 * Factory function to create explicitly typed Express routers.
 * This satisfies the TypeScript declaration emitter
 */
export const createRouter = (options?: RouterOptions): Router => {
  return Router(options);
};
