import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { UpdateSchoolInput } from "./school.schema";

export const schoolService = {
  async getProfile(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        email: true,
        phone: true,
        address: true,
        logoUrl: true,
        plan: true,
        isActive: true,
        trialEndsAt: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    });

    if (!school) {
      throw new AppError("School not found.", 404, "NOT_FOUND");
    }

    return school;
  },

  async updateProfile(schoolId: string, input: UpdateSchoolInput) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    if (!school) {
      throw new AppError("School not found.", 404, "NOT_FOUND");
    }

    return prisma.school.update({
      where: { id: schoolId },
      data: input,
      select: {
        id: true,
        name: true,
        subdomain: true,
        email: true,
        phone: true,
        address: true,
        logoUrl: true,
        plan: true,
        updatedAt: true,
      },
    });
  },

  // SUPER_ADMIN only
  async getAllSchools() {
    return prisma.school.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { students: true, teachers: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
