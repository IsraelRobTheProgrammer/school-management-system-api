import { createRouter } from "../../types/express";
import { authController } from "./auth.controller";

const router = createRouter();

// POST /api/v1/auth/register  — School onboarding
router.post("/register", authController.register);

// POST /api/v1/auth/login
router.post("/login", authController.login);

// POST /api/v1/auth/refresh
router.post("/refresh", authController.refresh);

// POST /api/v1/auth/logout
router.post("/logout", authController.logout);

export default router;
