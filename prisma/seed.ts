import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...");

  // ── Super Admin ────────────────────────────────────────────────────────────
  const superAdminEmail = "superadmin@schoolms.com";
  const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: await bcrypt.hash("SuperAdmin123!", 12),
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
        schoolId: null,
      },
    });
    console.log(" Super admin created:", superAdminEmail);
  } else {
    console.log(" Super admin already exists, skipping.");
  }

  // ── Demo School ────────────────────────────────────────────────────────────
  const demoSubdomain = "demo-school";
  let school = await prisma.school.findUnique({ where: { subdomain: demoSubdomain } });

  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "Demo Academy",
        subdomain: demoSubdomain,
        email: "admin@demoacademy.com",
        plan: "PREMIUM",
      },
    });
    console.log(" Demo school created:", school.name);

    // School admin
    await prisma.user.create({
      data: {
        schoolId: school.id,
        email: "admin@demoacademy.com",
        passwordHash: await bcrypt.hash("Admin123!", 12),
        firstName: "Demo",
        lastName: "Admin",
        role: "SCHOOL_ADMIN",
      },
    });
    console.log(" School admin created: admin@demoacademy.com / Admin123!");

    // Classes
    const classes = await prisma.$transaction([
      prisma.class.create({ data: { schoolId: school.id, name: "JSS 1A", level: "JSS 1" } }),
      prisma.class.create({ data: { schoolId: school.id, name: "JSS 2A", level: "JSS 2" } }),
      prisma.class.create({ data: { schoolId: school.id, name: "SS 1A",  level: "SS 1"  } }),
    ]);
    console.log(" 3 classes created");

    // Demo teacher
    const teacherUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: "teacher@demoacademy.com",
        passwordHash: await bcrypt.hash("Teacher123!", 12),
        firstName: "Jane",
        lastName: "Doe",
        role: "TEACHER",
      },
    });
    await prisma.teacher.create({
      data: { schoolId: school.id, userId: teacherUser.id, employeeId: "EMP001" },
    });
    console.log(" Demo teacher created: teacher@demoacademy.com / Teacher123!");

    // Demo student
    const studentUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: "student@demoacademy.com",
        passwordHash: await bcrypt.hash("Student123!", 12),
        firstName: "John",
        lastName: "Smith",
        role: "STUDENT",
      },
    });
    await prisma.student.create({
      data: {
        schoolId: school.id,
        userId: studentUser.id,
        classId: classes[0].id,
        admissionNumber: "2024/001",
        guardianName: "Mr. Smith",
        guardianPhone: "+2348012345678",
      },
    });
    console.log(" Demo student created: student@demoacademy.com / Student123!");
  } else {
    console.log("  Demo school already exists, skipping.");
  }

  console.log("\n Seeding complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
