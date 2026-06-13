import { prisma } from "../../config/database";
import { hashPassword, comparePassword } from "../../utils/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { RegisterSchoolInput, LoginInput } from "./auth.schema";

export const authService = {
  /**
   * Registers a new school and its first admin account in a single transaction.
   * If either the school or user creation fails, both are rolled back.
   */
  async register(input: RegisterSchoolInput) {
    const {
      schoolName,
      subdomain,
      schoolEmail,
      schoolPhone,
      address,
      firstName,
      lastName,
      adminEmail,
      password,
    } = input;

    // Check subdomain uniqueness before starting transaction
    const existingSchool = await prisma.school.findUnique({
      where: { subdomain },
    });
    if (existingSchool) {
      throw new AppError(
        `The subdomain "${subdomain}" is already taken. Please choose another.`,
        409,
        "SUBDOMAIN_TAKEN",
      );
    }

    // Check admin email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        "EMAIL_TAKEN",
      );
    }

    const passwordHash = await hashPassword(password);

    // Transaction: both school and user are created together or not at all
    const { school, user } = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          subdomain,
          email: schoolEmail,
          phone: schoolPhone,
          address,
          plan: "BASIC", // All schools start on BASIC
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        },
      });

      const user = await tx.user.create({
        data: {
          schoolId: school.id,
          email: adminEmail,
          passwordHash,
          firstName,
          lastName,
          role: "SCHOOL_ADMIN",
        },
      });

      return { school, user };
    });

    // Issue tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: school.id,
      plan: school.plan,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Persist refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        plan: school.plan,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  },

  /**
   * Authenticates a user by email and password.
   * Returns tokens on success, throws AppError on failure.
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { school: true },
    });

    // Use the same error message for both "not found" and "wrong password"
    // — never tell an attacker which one it was
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    if (!user.isActive) {
      throw new AppError(
        "Your account has been deactivated. Please contact your administrator.",
        403,
        "ACCOUNT_DEACTIVATED",
      );
    }

    if (user.school && !user.school.isActive) {
      throw new AppError(
        "Your school's account has been suspended. Please contact support.",
        403,
        "SCHOOL_SUSPENDED",
      );
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      plan: user.school?.plan ?? null,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Persist new refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        plan: user.school?.plan ?? null,
      },
    };
  },

  /**
   * Issues a new access token from a valid refresh token.
   * The old refresh token is deleted and a new one is issued (rotation).
   */
  async refresh(refreshToken: string) {
    // Verify the token is cryptographically valid first
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(
        "Invalid or expired refresh token. Please log in again.",
        401,
        "REFRESH_TOKEN_INVALID",
      );
    }

    // Then check it exists in the DB (allows us to revoke tokens)
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { school: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(
        "Refresh token not found or expired. Please log in again.",
        401,
        "REFRESH_TOKEN_EXPIRED",
      );
    }

    const { user } = stored;

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      plan: user.school?.plan ?? null,
    };

    // Token rotation: delete old, issue new
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  /**
   * Invalidates a refresh token. Called on logout.
   */
  async logout(refreshToken: string) {
    // Silently ignore if token doesn't exist — idempotent logout
    await prisma.refreshToken
      .delete({ where: { token: refreshToken } })
      .catch(() => null);
  },
};
