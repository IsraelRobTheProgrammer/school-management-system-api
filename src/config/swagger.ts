import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { env } from "./env";

// ─── Reusable schema fragments ────────────────────────────────────────────────

const uuidParam = (name: string, description: string) => ({
  name,
  in: "path" as const,
  required: true,
  description,
  schema: { type: "string", format: "uuid" },
});

const successResponse = (description: string, dataSchema: object) => ({
  200: {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: dataSchema,
          },
        },
      },
    },
  },
});

const errorResponses = {
  400: { description: "Validation error" },
  401: { description: "Unauthorized — missing or invalid token" },
  403: { description: "Forbidden — insufficient role or plan" },
  404: { description: "Resource not found" },
  409: { description: "Conflict — duplicate value" },
};

// ─── Shared schemas ───────────────────────────────────────────────────────────

const schemas = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  RegisterSchoolRequest: {
    type: "object",
    required: [
      "schoolName",
      "subdomain",
      "adminEmail",
      "password",
      "firstName",
      "lastName",
    ],
    properties: {
      schoolName: { type: "string", example: "Greenfield Academy" },
      subdomain: {
        type: "string",
        example: "greenfield",
        description: "Lowercase letters, numbers, hyphens only",
      },
      schoolEmail: {
        type: "string",
        format: "email",
        example: "info@greenfield.com",
      },
      schoolPhone: { type: "string", example: "+2348012345678" },
      address: { type: "string", example: "12 Lekki Phase 1, Lagos" },
      firstName: { type: "string", example: "John" },
      lastName: { type: "string", example: "Doe" },
      adminEmail: {
        type: "string",
        format: "email",
        example: "admin@greenfield.com",
      },
      password: {
        type: "string",
        example: "Admin123!",
        description: "Min 8 chars, 1 uppercase, 1 number",
      },
    },
  },
  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: {
        type: "string",
        format: "email",
        example: "admin@greenfield.com",
      },
      password: { type: "string", example: "Admin123!" },
    },
  },
  RefreshTokenRequest: {
    type: "object",
    required: ["refreshToken"],
    properties: {
      refreshToken: {
        type: "string",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      },
    },
  },
  TokenResponse: {
    type: "object",
    properties: {
      accessToken: { type: "string" },
      refreshToken: { type: "string" },
      user: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string" },
          role: {
            type: "string",
            enum: [
              "SUPER_ADMIN",
              "SCHOOL_ADMIN",
              "TEACHER",
              "STUDENT",
              "PARENT",
            ],
          },
        },
      },
    },
  },

  // ── Class ─────────────────────────────────────────────────────────────────
  CreateClassRequest: {
    type: "object",
    required: ["name", "level"],
    properties: {
      name: { type: "string", example: "JSS 1A" },
      level: { type: "string", example: "JSS 1" },
      description: {
        type: "string",
        example: "Junior Secondary School 1, Stream A",
      },
    },
  },

  // ── Teacher ───────────────────────────────────────────────────────────────
  CreateTeacherRequest: {
    type: "object",
    required: ["firstName", "lastName", "email", "password"],
    properties: {
      firstName: { type: "string", example: "Jane" },
      lastName: { type: "string", example: "Doe" },
      email: {
        type: "string",
        format: "email",
        example: "jane.doe@school.com",
      },
      password: { type: "string", example: "Teacher123!" },
      employeeId: { type: "string", example: "EMP001" },
      gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
      phone: { type: "string", example: "+2348012345678" },
      address: { type: "string", example: "5 Victoria Island, Lagos" },
    },
  },

  // ── Student ───────────────────────────────────────────────────────────────
  CreateStudentRequest: {
    type: "object",
    required: ["firstName", "lastName", "email", "password", "admissionNumber"],
    properties: {
      firstName: { type: "string", example: "Emeka" },
      lastName: { type: "string", example: "Obi" },
      email: { type: "string", format: "email", example: "emeka@school.com" },
      password: { type: "string", example: "Student123!" },
      admissionNumber: { type: "string", example: "2024/001" },
      classId: { type: "string", format: "uuid" },
      gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
      dateOfBirth: {
        type: "string",
        format: "date-time",
        example: "2010-05-15T00:00:00.000Z",
      },
      guardianName: { type: "string", example: "Mr. Obi" },
      guardianPhone: { type: "string", example: "+2348012345678" },
      guardianEmail: {
        type: "string",
        format: "email",
        example: "mr.obi@email.com",
      },
    },
  },

  // ── Subject ───────────────────────────────────────────────────────────────
  CreateSubjectRequest: {
    type: "object",
    required: ["classId", "name"],
    properties: {
      classId: { type: "string", format: "uuid" },
      name: { type: "string", example: "Mathematics" },
      code: { type: "string", example: "MTH101" },
    },
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  RecordAttendanceRequest: {
    type: "object",
    required: ["classId", "date", "records"],
    properties: {
      classId: { type: "string", format: "uuid" },
      date: {
        type: "string",
        example: "2024-10-01",
        description: "YYYY-MM-DD",
      },
      records: {
        type: "array",
        items: {
          type: "object",
          required: ["studentId", "status"],
          properties: {
            studentId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
            },
            note: { type: "string", example: "Doctor's appointment" },
          },
        },
      },
    },
  },

  // ── Grade ─────────────────────────────────────────────────────────────────
  CreateGradeRequest: {
    type: "object",
    required: [
      "studentId",
      "subjectId",
      "classId",
      "term",
      "academicYear",
      "caScore",
      "examScore",
    ],
    properties: {
      studentId: { type: "string", format: "uuid" },
      subjectId: { type: "string", format: "uuid" },
      classId: { type: "string", format: "uuid" },
      term: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
      academicYear: {
        type: "string",
        example: "2024/2025",
        description: "Format: YYYY/YYYY",
      },
      caScore: { type: "number", minimum: 0, maximum: 40, example: 35 },
      examScore: { type: "number", minimum: 0, maximum: 60, example: 52 },
      comment: { type: "string", example: "Good effort. Keep it up." },
    },
  },

  // ── Timetable ─────────────────────────────────────────────────────────────
  CreateTimetableRequest: {
    type: "object",
    required: [
      "classId",
      "subjectId",
      "teacherId",
      "dayOfWeek",
      "startTime",
      "endTime",
    ],
    properties: {
      classId: { type: "string", format: "uuid" },
      subjectId: { type: "string", format: "uuid" },
      teacherId: { type: "string", format: "uuid" },
      dayOfWeek: {
        type: "string",
        enum: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      },
      startTime: {
        type: "string",
        example: "08:00",
        description: "HH:MM 24-hour format",
      },
      endTime: { type: "string", example: "09:00" },
    },
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  InitializeSubscriptionRequest: {
    type: "object",
    required: ["plan", "billingInterval"],
    properties: {
      plan: { type: "string", enum: ["BASIC", "PREMIUM"] },
      billingInterval: { type: "string", enum: ["MONTHLY", "TERMLY"] },
    },
  },

  // ── Parent ────────────────────────────────────────────────────────────────
  RegisterParentRequest: {
    type: "object",
    required: ["firstName", "lastName", "email", "password", "inviteCode"],
    properties: {
      firstName: { type: "string", example: "Michael" },
      lastName: { type: "string", example: "Obi" },
      email: {
        type: "string",
        format: "email",
        example: "michael.obi@email.com",
      },
      password: { type: "string", example: "Parent123!" },
      phone: { type: "string", example: "+2348012345678" },
      inviteCode: { type: "string", example: "INV-A3F9X2" },
    },
  },
};

// ─── Full OpenAPI spec ────────────────────────────────────────────────────────

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "SchoolMS API",
    version: "1.0.0",
    description: `
## Multi-Tenant School Management System

A production-grade SaaS backend. Each school is an isolated tenant.

### Authentication
After logging in, click **Authorize** (top right) and paste your \`accessToken\` as:
\`\`\`
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### Plans
- **Basic** — core school management features + CSV exports
- **Premium** — adds PDF report cards and the parent portal

### Grading Scale
| Score | Grade |
|-------|-------|
| 70–100 | A — Excellent |
| 60–69  | B — Very Good |
| 50–59  | C — Good |
| 45–49  | D — Pass |
| 40–44  | E — Poor |
| 0–39   | F — Fail |
    `,
    contact: {
      name: "SchoolMS",
      email: "support@schoolms.com",
    },
  },
  servers: [
    {
      url: `{baseUrl}/api/${env.API_VERSION}`,
      description: "API server",
      variables: {
        baseUrl: {
          default:
            env.NODE_ENV === "production"
              ? "https://schoolms.railway.app"
              : `http://localhost:${env.PORT}`,
          description: "Base URL",
        },
      },
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste your accessToken from the login response",
      },
    },
    schemas,
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Registration, login, token management" },
    { name: "School", description: "School profile management" },
    { name: "Classes", description: "Class CRUD — scoped to your school" },
    { name: "Teachers", description: "Teacher management" },
    { name: "Students", description: "Student management" },
    { name: "Subjects", description: "Subject management — scoped to a class" },
    {
      name: "Attendance",
      description: "Bulk attendance recording and queries",
    },
    { name: "Grades", description: "Grade entry and term reports" },
    { name: "Timetable", description: "Weekly schedule management" },
    { name: "Billing", description: "Paystack subscription management" },
    {
      name: "Admin",
      description: "Super admin — cross-tenant dashboard and controls",
    },
    { name: "Reports", description: "PDF report card generation (Premium)" },
    {
      name: "Parents",
      description: "Invite codes and parent portal (Premium)",
    },
    { name: "Exports", description: "CSV data exports" },
  ],
  paths: {
    // ── Auth ───────────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new school",
        description:
          "Creates a new school tenant and its first admin account in a single atomic transaction. The school starts on a 14-day free trial.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterSchoolRequest" },
            },
          },
        },
        responses: {
          201: {
            description:
              "School registered — returns tokens and school/user details",
          },
          409: { description: "Subdomain or email already taken" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description:
              "Login successful — returns accessToken, refreshToken, user",
          },
          401: { description: "Invalid credentials" },
          403: { description: "Account or school is deactivated" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description:
          "Issues a new access token from a valid refresh token. The old refresh token is invalidated (rotation).",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          200: { description: "Returns new accessToken and refreshToken" },
          401: { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        description:
          "Invalidates the refresh token. The access token expires naturally after 15 minutes.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: { 200: { description: "Logged out successfully" } },
      },
    },

    // ── School ─────────────────────────────────────────────────────────────
    "/schools/profile": {
      get: {
        tags: ["School"],
        summary: "Get school profile",
        description:
          "Returns school details plus counts of students, teachers, and classes.",
        responses: {
          ...successResponse("School profile", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["School"],
        summary: "Update school profile",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  address: { type: "string" },
                  logoUrl: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated school", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/schools/all": {
      get: {
        tags: ["School", "Admin"],
        summary: "List all schools (Super Admin)",
        description: "Returns all tenants. Requires SUPER_ADMIN role.",
        responses: {
          ...successResponse("All schools", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },

    // ── Classes ────────────────────────────────────────────────────────────
    "/classes": {
      get: {
        tags: ["Classes"],
        summary: "List all classes",
        description:
          "Returns all classes for the authenticated school with student counts.",
        responses: {
          ...successResponse("Classes list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Classes"],
        summary: "Create a class",
        description: "Requires SCHOOL_ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateClassRequest" },
            },
          },
        },
        responses: { 201: { description: "Class created" }, ...errorResponses },
      },
    },
    "/classes/{id}": {
      get: {
        tags: ["Classes"],
        summary: "Get class by ID",
        parameters: [uuidParam("id", "Class ID")],
        responses: {
          ...successResponse("Class details", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Classes"],
        summary: "Update class",
        parameters: [uuidParam("id", "Class ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  level: { type: "string" },
                  description: { type: "string" },
                  classTeacherId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated class", { type: "object" }),
          ...errorResponses,
        },
      },
      delete: {
        tags: ["Classes"],
        summary: "Delete class",
        parameters: [uuidParam("id", "Class ID")],
        responses: { 200: { description: "Class deleted" }, ...errorResponses },
      },
    },

    // ── Teachers ───────────────────────────────────────────────────────────
    "/teachers": {
      get: {
        tags: ["Teachers"],
        summary: "List all teachers",
        responses: {
          ...successResponse("Teachers list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Teachers"],
        summary: "Create a teacher",
        description:
          "Creates both a User account (role: TEACHER) and a Teacher profile in a single transaction.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTeacherRequest" },
            },
          },
        },
        responses: {
          201: { description: "Teacher created" },
          ...errorResponses,
        },
      },
    },
    "/teachers/{id}": {
      get: {
        tags: ["Teachers"],
        summary: "Get teacher by ID",
        parameters: [uuidParam("id", "Teacher ID")],
        responses: {
          ...successResponse("Teacher details", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Teachers"],
        summary: "Update teacher",
        parameters: [uuidParam("id", "Teacher ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  phone: { type: "string" },
                  employeeId: { type: "string" },
                  gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"] },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated teacher", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/teachers/{id}/deactivate": {
      patch: {
        tags: ["Teachers"],
        summary: "Deactivate teacher",
        description:
          "Soft-deactivates the teacher's account. Data is preserved.",
        parameters: [uuidParam("id", "Teacher ID")],
        responses: {
          200: { description: "Teacher deactivated" },
          ...errorResponses,
        },
      },
    },

    // ── Students ───────────────────────────────────────────────────────────
    "/students": {
      get: {
        tags: ["Students"],
        summary: "List all students",
        parameters: [
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by class",
          },
        ],
        responses: {
          ...successResponse("Students list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Students"],
        summary: "Create a student",
        description:
          "Creates both a User account (role: STUDENT) and a Student profile in a single transaction.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStudentRequest" },
            },
          },
        },
        responses: {
          201: { description: "Student created" },
          ...errorResponses,
        },
      },
    },
    "/students/{id}": {
      get: {
        tags: ["Students"],
        summary: "Get student by ID",
        parameters: [uuidParam("id", "Student ID")],
        responses: {
          ...successResponse("Student details", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Students"],
        summary: "Update student",
        parameters: [uuidParam("id", "Student ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  classId: { type: "string", format: "uuid" },
                  guardianName: { type: "string" },
                  guardianPhone: { type: "string" },
                  guardianEmail: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated student", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/students/{id}/deactivate": {
      patch: {
        tags: ["Students"],
        summary: "Deactivate student",
        parameters: [uuidParam("id", "Student ID")],
        responses: {
          200: { description: "Student deactivated" },
          ...errorResponses,
        },
      },
    },

    // ── Subjects ───────────────────────────────────────────────────────────
    "/subjects": {
      get: {
        tags: ["Subjects"],
        summary: "List all subjects",
        parameters: [
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by class",
          },
        ],
        responses: {
          ...successResponse("Subjects list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
      post: {
        tags: ["Subjects"],
        summary: "Create a subject",
        description: "Subject names must be unique within a class.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSubjectRequest" },
            },
          },
        },
        responses: {
          201: { description: "Subject created" },
          ...errorResponses,
        },
      },
    },
    "/subjects/{id}": {
      get: {
        tags: ["Subjects"],
        summary: "Get subject by ID",
        parameters: [uuidParam("id", "Subject ID")],
        responses: {
          ...successResponse("Subject details", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Subjects"],
        summary: "Update subject",
        parameters: [uuidParam("id", "Subject ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  code: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated subject", { type: "object" }),
          ...errorResponses,
        },
      },
      delete: {
        tags: ["Subjects"],
        summary: "Delete subject",
        parameters: [uuidParam("id", "Subject ID")],
        responses: {
          200: { description: "Subject deleted" },
          ...errorResponses,
        },
      },
    },

    // ── Attendance ─────────────────────────────────────────────────────────
    "/attendance": {
      post: {
        tags: ["Attendance"],
        summary: "Record bulk attendance",
        description:
          "Takes attendance for an entire class at once. Uses upsert — re-submitting corrects existing records for that date.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordAttendanceRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Attendance recorded",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    date: "2024-10-01",
                    className: "JSS 1A",
                    totalRecorded: 30,
                    summary: { present: 27, absent: 2, late: 1, excused: 0 },
                  },
                },
              },
            },
          },
          ...errorResponses,
        },
      },
      get: {
        tags: ["Attendance"],
        summary: "Query attendance records",
        description:
          "Filter by classId + date, or studentId + date range. At least one filter is required.",
        parameters: [
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "studentId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "date",
            in: "query",
            schema: { type: "string", example: "2024-10-01" },
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", example: "2024-09-01" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", example: "2024-12-31" },
          },
        ],
        responses: {
          ...successResponse("Attendance records", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },
    "/attendance/summary/{studentId}": {
      get: {
        tags: ["Attendance"],
        summary: "Student attendance summary",
        description:
          "Returns total days, present count, and attendance percentage for a student.",
        parameters: [uuidParam("studentId", "Student ID")],
        responses: {
          ...successResponse("Attendance summary", {
            type: "object",
            properties: {
              summary: {
                type: "object",
                properties: {
                  totalDays: { type: "number" },
                  present: { type: "number" },
                  absent: { type: "number" },
                  late: { type: "number" },
                  excused: { type: "number" },
                  attendancePercentage: { type: "number", example: 92 },
                },
              },
            },
          }),
          ...errorResponses,
        },
      },
    },
    "/attendance/{id}": {
      patch: {
        tags: ["Attendance"],
        summary: "Correct a single attendance record",
        parameters: [uuidParam("id", "Attendance record ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PRESENT", "ABSENT", "LATE", "EXCUSED"],
                  },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated record", { type: "object" }),
          ...errorResponses,
        },
      },
    },

    // ── Grades ─────────────────────────────────────────────────────────────
    "/grades": {
      post: {
        tags: ["Grades"],
        summary: "Enter or update a grade (upsert)",
        description:
          "CA max: 40, Exam max: 60. `totalScore` and `letterGrade` are always computed server-side — never trusted from the client.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateGradeRequest" },
            },
          },
        },
        responses: { 201: { description: "Grade saved" }, ...errorResponses },
      },
      get: {
        tags: ["Grades"],
        summary: "Query grades",
        parameters: [
          {
            name: "studentId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "subjectId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "term",
            in: "query",
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          ...successResponse("Grades list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },
    "/grades/report/student/{studentId}": {
      get: {
        tags: ["Grades"],
        summary: "Student term report",
        description:
          "Full term report with per-subject breakdown and overall summary. Accessible by ADMIN, TEACHER, STUDENT, and PARENT (if linked).",
        parameters: [
          uuidParam("studentId", "Student ID"),
          {
            name: "term",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            required: true,
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          ...successResponse("Student term report", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/grades/report/class/{classId}": {
      get: {
        tags: ["Grades"],
        summary: "Class term report",
        description:
          "All grades for every student in a class for a given term.",
        parameters: [
          uuidParam("classId", "Class ID"),
          {
            name: "term",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            required: true,
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          ...successResponse("Class term report", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/grades/{id}": {
      get: {
        tags: ["Grades"],
        summary: "Get grade by ID",
        parameters: [uuidParam("id", "Grade ID")],
        responses: {
          ...successResponse("Grade record", { type: "object" }),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Grades"],
        summary: "Update grade scores",
        parameters: [uuidParam("id", "Grade ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  caScore: { type: "number", minimum: 0, maximum: 40 },
                  examScore: { type: "number", minimum: 0, maximum: 60 },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated grade", { type: "object" }),
          ...errorResponses,
        },
      },
    },

    // ── Timetable ──────────────────────────────────────────────────────────
    "/timetable": {
      post: {
        tags: ["Timetable"],
        summary: "Create a timetable entry",
        description:
          "A class cannot have two subjects at the same time slot on the same day.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTimetableRequest" },
            },
          },
        },
        responses: {
          201: { description: "Timetable entry created" },
          ...errorResponses,
        },
      },
    },
    "/timetable/class/{classId}": {
      get: {
        tags: ["Timetable"],
        summary: "Get class weekly timetable",
        description: "Returns the full schedule grouped by day of week.",
        parameters: [uuidParam("classId", "Class ID")],
        responses: {
          ...successResponse("Class timetable", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/timetable/teacher/{teacherId}": {
      get: {
        tags: ["Timetable"],
        summary: "Get teacher weekly timetable",
        description:
          "Returns all periods assigned to the teacher, grouped by day.",
        parameters: [uuidParam("teacherId", "Teacher ID")],
        responses: {
          ...successResponse("Teacher timetable", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/timetable/{id}": {
      patch: {
        tags: ["Timetable"],
        summary: "Update timetable entry",
        parameters: [uuidParam("id", "Timetable entry ID")],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  teacherId: { type: "string", format: "uuid" },
                  startTime: { type: "string", example: "09:00" },
                  endTime: { type: "string", example: "10:00" },
                },
              },
            },
          },
        },
        responses: {
          ...successResponse("Updated entry", { type: "object" }),
          ...errorResponses,
        },
      },
      delete: {
        tags: ["Timetable"],
        summary: "Delete timetable entry",
        parameters: [uuidParam("id", "Timetable entry ID")],
        responses: { 200: { description: "Entry deleted" }, ...errorResponses },
      },
    },

    // ── Billing ────────────────────────────────────────────────────────────
    "/billing/initialize": {
      post: {
        tags: ["Billing"],
        summary: "Initialize a subscription",
        description:
          "Creates a pending invoice and calls Paystack to initialize a transaction. Returns an `authorizationUrl` — redirect the user to this URL to complete payment on Paystack's hosted page.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/InitializeSubscriptionRequest",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Payment initialized",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    authorizationUrl: "https://checkout.paystack.com/xxxx",
                    reference: "SCH-A1B2C3-XXXX",
                    plan: "PREMIUM",
                    billingInterval: "MONTHLY",
                    amountNaira: 25000,
                  },
                },
              },
            },
          },
          ...errorResponses,
        },
      },
    },
    "/billing/webhook": {
      post: {
        tags: ["Billing"],
        summary: "Paystack webhook receiver",
        description:
          "⚠️ This endpoint is called by Paystack only — not by your frontend. Signature is verified via HMAC SHA512. Handled events: `charge.success`, `subscription.disable`, `invoice.payment_failed`, `invoice.create`.",
        security: [],
        responses: {
          200: {
            description:
              "Event received (always returns 200 to prevent Paystack retries)",
          },
          400: { description: "Missing signature header" },
        },
      },
    },
    "/billing/verify/{reference}": {
      post: {
        tags: ["Billing"],
        summary: "Manually verify a payment",
        description:
          "Fallback if the webhook was missed. Calls Paystack directly to verify the transaction and activates the subscription if successful.",
        parameters: [
          {
            name: "reference",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Paystack payment reference",
          },
        ],
        responses: {
          200: { description: "Payment verified and subscription activated" },
          402: { description: "Payment not successful" },
          ...errorResponses,
        },
      },
    },
    "/billing/subscription": {
      get: {
        tags: ["Billing"],
        summary: "Get subscription status",
        description: "Returns current subscription state and last 5 invoices.",
        responses: {
          ...successResponse("Subscription status and invoice history", {
            type: "object",
          }),
          ...errorResponses,
        },
      },
    },
    "/billing/cancel": {
      post: {
        tags: ["Billing"],
        summary: "Cancel subscription",
        description:
          "Cancels immediately in the DB and downgrades school to BASIC. Paystack also sends a `subscription.disable` webhook to confirm.",
        responses: {
          200: { description: "Subscription cancelled" },
          ...errorResponses,
        },
      },
    },

    // ── Admin ──────────────────────────────────────────────────────────────
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "SaaS dashboard metrics",
        description:
          "Requires SUPER_ADMIN role. Returns MRR, school counts, plan breakdown, subscription statuses, and recent signups.",
        responses: {
          ...successResponse("Dashboard data", {
            type: "object",
            properties: {
              overview: {
                type: "object",
                properties: {
                  totalSchools: { type: "number" },
                  activeSchools: { type: "number" },
                  totalStudents: { type: "number" },
                  totalTeachers: { type: "number" },
                },
              },
              revenue: {
                type: "object",
                properties: {
                  mrrNaira: { type: "number" },
                  lastMonthNaira: { type: "number" },
                  revenueGrowthPercent: { type: "number" },
                },
              },
              planBreakdown: {
                type: "object",
                example: { BASIC: 20, PREMIUM: 18 },
              },
              subscriptionBreakdown: {
                type: "object",
                example: { ACTIVE: 35, TRIAL: 5, CANCELLED: 2 },
              },
            },
          }),
          ...errorResponses,
        },
      },
    },
    "/admin/schools": {
      get: {
        tags: ["Admin"],
        summary: "List all schools (paginated)",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          ...successResponse("Paginated schools list", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/admin/schools/{id}/toggle": {
      patch: {
        tags: ["Admin"],
        summary: "Activate or suspend a school",
        description:
          "Suspended schools cannot log in. Their data is preserved.",
        parameters: [uuidParam("id", "School ID")],
        responses: {
          200: { description: "School status toggled" },
          ...errorResponses,
        },
      },
    },
    "/admin/revenue": {
      get: {
        tags: ["Admin"],
        summary: "Monthly revenue history",
        parameters: [
          {
            name: "months",
            in: "query",
            schema: { type: "integer", default: 6 },
            description: "Number of months to return",
          },
        ],
        responses: {
          ...successResponse("Monthly revenue totals", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },

    // ── Reports ────────────────────────────────────────────────────────────
    "/reports/pdf/{studentId}": {
      get: {
        tags: ["Reports"],
        summary: "Download PDF report card (Premium)",
        description:
          "Generates and streams a PDF report card. Requires **Premium** plan. The browser triggers a file download automatically.",
        parameters: [
          uuidParam("studentId", "Student ID"),
          {
            name: "term",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            required: true,
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          200: {
            description: "PDF file stream",
            content: {
              "application/pdf": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          403: { description: "Premium plan required" },
          404: { description: "No grades found for this term" },
        },
      },
    },

    // ── Parents ────────────────────────────────────────────────────────────
    "/parents/register": {
      post: {
        tags: ["Parents"],
        summary: "Register as a parent (public)",
        description:
          "No authentication required. The invite code is the credential — it links the parent to their child and school automatically.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterParentRequest" },
            },
          },
        },
        responses: {
          201: { description: "Parent account created and linked to student" },
          ...errorResponses,
        },
      },
    },
    "/parents/invite/{studentId}": {
      post: {
        tags: ["Parents"],
        summary: "Generate invite code for a student (Premium)",
        description:
          "Generates a 7-day single-use invite code. Any previous unused code for the same student is immediately expired. Share this code with the parent via SMS or WhatsApp.",
        parameters: [uuidParam("studentId", "Student ID")],
        responses: {
          201: {
            description: "Invite code generated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    code: "INV-A3F9X2",
                    studentName: "Emeka Obi",
                    className: "JSS 1A",
                    expiresAt: "2024-10-08T00:00:00.000Z",
                  },
                },
              },
            },
          },
          ...errorResponses,
        },
      },
    },
    "/parents/invites": {
      get: {
        tags: ["Parents"],
        summary: "List all invite codes (Premium)",
        description:
          "Returns all invite codes for the school with status: pending, used, or expired.",
        responses: {
          ...successResponse("Invites list", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },
    "/parents/me/students": {
      get: {
        tags: ["Parents"],
        summary: "List my linked students (Parent)",
        description: "Returns all students linked to the authenticated parent.",
        responses: {
          ...successResponse("Linked students", {
            type: "array",
            items: { type: "object" },
          }),
          ...errorResponses,
        },
      },
    },
    "/parents/me/students/{studentId}/report": {
      get: {
        tags: ["Parents"],
        summary: "View child's term report (Parent)",
        description:
          "Returns the student's grades for a given term. Only accessible if the authenticated parent is explicitly linked to this student.",
        parameters: [
          uuidParam("studentId", "Student ID"),
          {
            name: "term",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            required: true,
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          ...successResponse("Student term report", { type: "object" }),
          ...errorResponses,
        },
      },
    },
    "/parents/me/students/{studentId}/attendance": {
      get: {
        tags: ["Parents"],
        summary: "View child's attendance (Parent)",
        description:
          "Returns attendance summary and full record list. Gated by parent-student join table — parents cannot view other students.",
        parameters: [uuidParam("studentId", "Student ID")],
        responses: {
          ...successResponse("Attendance data", { type: "object" }),
          ...errorResponses,
        },
      },
    },

    // ── Exports ────────────────────────────────────────────────────────────
    "/exports/attendance": {
      get: {
        tags: ["Exports"],
        summary: "Export attendance as CSV",
        description:
          "Streams a CSV file. Available on all plans. At least `classId` or `startDate` is required.",
        parameters: [
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", example: "2024-09-01" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", example: "2024-12-31" },
          },
        ],
        responses: {
          200: {
            description: "CSV file download",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          ...errorResponses,
        },
      },
    },
    "/exports/grades": {
      get: {
        tags: ["Exports"],
        summary: "Export grades as CSV",
        description:
          "Streams a CSV file. `term` and `academicYear` are required.",
        parameters: [
          {
            name: "classId",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "term",
            in: "query",
            required: true,
            schema: { type: "string", enum: ["FIRST", "SECOND", "THIRD"] },
          },
          {
            name: "academicYear",
            in: "query",
            required: true,
            schema: { type: "string", example: "2024/2025" },
          },
        ],
        responses: {
          200: {
            description: "CSV file download",
            content: { "text/csv": { schema: { type: "string" } } },
          },
          ...errorResponses,
        },
      },
    },
  },
};

// ─── Mount function ───────────────────────────────────────────────────────────
export const mountSwagger = (app: Express): void => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "SchoolMS API Docs",
      customCss: `
        .swagger-ui .topbar { background-color: #1a365d; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info h2.title { color: #1a365d; }
      `,
      swaggerOptions: {
        persistAuthorization: true, // JWT survives page refresh
        displayRequestDuration: true,
        filter: true, // search box across all endpoints
        tryItOutEnabled: true, // "Try it out" open by default
      },
    }),
  );

  // Also expose the raw JSON spec — useful for importing into Postman
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log(`📚 Swagger UI: http://localhost:${env.PORT}/api-docs`);
  console.log(`📄 OpenAPI JSON: http://localhost:${env.PORT}/api-docs.json`);
};
