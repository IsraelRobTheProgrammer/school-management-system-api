import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";

export const adminService = {
  /**
   * Core SaaS dashboard metrics.
   * Everything a founder needs to understand the business at a glance.
   */
  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalSchools,
      activeSchools,
      planBreakdown,
      subscriptionBreakdown,
      mrr,
      lastMonthRevenue,
      recentSignups,
      totalStudents,
      totalTeachers,
    ] = await Promise.all([
      // Total schools ever registered
      prisma.school.count(),

      // Currently active schools
      prisma.school.count({ where: { isActive: true } }),

      // How many schools are on each plan
      prisma.school.groupBy({
        by: ["plan"],
        _count: { plan: true },
      }),

      // Subscription status breakdown
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // MRR: sum of all paid invoices this month (in kobo, convert to naira)
      prisma.invoice.aggregate({
        where: {
          status: "PAID",
          paidAt: { gte: startOfMonth },
        },
        _sum: { amountKobo: true },
      }),

      // Last month's revenue for comparison
      prisma.invoice.aggregate({
        where: {
          status: "PAID",
          paidAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amountKobo: true },
      }),

      // 5 most recently registered schools
      prisma.school.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          subdomain: true,
          plan: true,
          isActive: true,
          createdAt: true,
          subscription: { select: { status: true } },
          _count: { select: { students: true, teachers: true } },
        },
      }),

      // Total students and teachers across all schools
      prisma.student.count(),
      prisma.teacher.count(),
    ]);

    const mrrNaira = (mrr._sum.amountKobo ?? 0) / 100;
    const lastMonthNaira = (lastMonthRevenue._sum.amountKobo ?? 0) / 100;
    const revenueGrowth =
      lastMonthNaira > 0
        ? Math.round(((mrrNaira - lastMonthNaira) / lastMonthNaira) * 100)
        : 0;

    return {
      overview: {
        totalSchools,
        activeSchools,
        inactiveSchools: totalSchools - activeSchools,
        totalStudents,
        totalTeachers,
      },
      revenue: {
        mrrNaira,
        lastMonthNaira,
        revenueGrowthPercent: revenueGrowth,
      },
      planBreakdown: planBreakdown.reduce(
        (acc, item) => {
          acc[item.plan] = item._count.plan;
          return acc;
        },
        {} as Record<string, number>,
      ),
      subscriptionBreakdown: subscriptionBreakdown.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentSignups,
    };
  },

  /**
   * All schools with their subscription and usage details.
   * Supports pagination to handle scale.
   */
  async getAllSchools(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          subdomain: true,
          plan: true,
          isActive: true,
          email: true,
          createdAt: true,
          subscription: {
            select: {
              status: true,
              billingInterval: true,
              currentPeriodEnd: true,
              cancelledAt: true,
            },
          },
          _count: {
            select: { students: true, teachers: true, classes: true },
          },
        },
      }),
      prisma.school.count(),
    ]);

    return {
      schools,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Toggle a school's active status.
   * Suspending a school blocks all their users from logging in
   * (the login service checks school.isActive).
   */
  async toggleSchoolStatus(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, isActive: true },
    });

    if (!school) throw new AppError("School not found.", 404, "NOT_FOUND");

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: !school.isActive },
      select: { id: true, name: true, isActive: true },
    });

    return {
      school: updated,
      message: updated.isActive
        ? `${updated.name} has been reactivated.`
        : `${updated.name} has been suspended.`,
    };
  },

  /**
   * Revenue history — monthly totals for the last N months.
   * Useful for charting on the frontend.
   */
  async getRevenueHistory(months = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await prisma.invoice.aggregate({
        where: {
          status: "PAID",
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountKobo: true },
        _count: true,
      });

      results.push({
        month: start.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        revenueNaira: (revenue._sum.amountKobo ?? 0) / 100,
        invoiceCount: revenue._count,
      });
    }

    return results;
  },
};
