# SchoolMS — Multi-Tenant School Management System

A production-grade multi-tenant SaaS backend built with **Express**, **TypeScript**, and **Prisma**. Each school is an isolated tenant. The system supports two subscription plans (Basic and Premium) with Paystack billing integration.

Built as a portfolio project to demonstrate real-world SaaS and multi-tenant backend architecture.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Client Apps                      │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────┐
│              Express + TypeScript API               │
│                                                     │
│  authenticate → enforceTenant → authorize           │
│  → requireActiveSubscription → requirePlan          │
│                                                     │
│  Modules: Auth · School · Class · Teacher           │
│           Student · Subject · Attendance · Grade    │
│           Timetable · Billing · Admin               │
│           Report · Parent · Export                  │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │   PostgreSQL (via   │
    │   Prisma ORM)       │
    └─────────────────────┘
```

### Multi-Tenancy Model

This project uses **shared database, shared schema** multi-tenancy — the simplest and most practical approach for a SaaS at this scale.

Every table (except `schools` itself) has a `schoolId` column. The `enforceTenant` middleware extracts the `schoolId` from the verified JWT and attaches it to `req.schoolId`. Every service function receives `schoolId` as a mandatory parameter — it is structurally impossible to write a query without it.

The `schoolId` comes from the **JWT**, never from the request body or URL params. This prevents any tenant from crafting a request that touches another tenant's data.

### Middleware Chain

Every authenticated, tenant-scoped request flows through:

```
authenticate        → Verifies JWT, attaches req.user
enforceTenant       → Extracts schoolId from token → req.schoolId
requireActiveSubscription → Checks subscription status from DB (not JWT)
authorize(role)     → Enforces role-based access control
requirePlan(plan)   → Gates premium features by subscription plan
```

### Subscription Plans

| Feature                   | Basic | Premium |
| ------------------------- | ----- | ------- |
| Student & teacher records | ✅    | ✅      |
| Attendance tracking       | ✅    | ✅      |
| Grades & timetable        | ✅    | ✅      |
| CSV exports               | ✅    | ✅      |
| PDF report cards          | ❌    | ✅      |
| Parent portal             | ❌    | ✅      |
| Multi-branch support      | ❌    | ✅      |

---

## Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Runtime        | Node.js 20                            |
| Framework      | Express 4                             |
| Language       | TypeScript 5 (strict mode)            |
| ORM            | Prisma 5                              |
| Database       | PostgreSQL                            |
| Auth           | JWT (access + refresh token rotation) |
| Validation     | Zod                                   |
| PDF Generation | PDFKit                                |
| Payments       | Paystack                              |
| Deployment     | Railway                               |
| CI/CD          | GitHub Actions                        |

---

## Project Structure

```
src/
├── config/
│   ├── env.ts          # Zod-validated environment variables
│   ├── database.ts     # Prisma singleton
│   └── paystack.ts     # Typed Paystack API client
├── middlewares/
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   ├── rbac.middleware.ts
│   ├── plan.guard.ts
│   └── subscription.guard.ts
├── modules/
│   ├── auth/           # Registration, login, token refresh
│   ├── school/         # School profile management
│   ├── class/          # Class CRUD
│   ├── teacher/        # Teacher CRUD
│   ├── student/        # Student CRUD
│   ├── subject/        # Subject CRUD
│   ├── attendance/     # Bulk attendance, summaries
│   ├── grade/          # Grade entry, term reports
│   ├── timetable/      # Weekly timetable builder
│   ├── billing/        # Paystack integration, webhooks
│   ├── admin/          # Super admin dashboard
│   ├── report/         # PDF report card generation
│   ├── parent/         # Invite codes, parent portal
│   └── export/         # CSV exports
├── utils/
│   ├── AppError.ts
│   ├── apiResponse.ts
│   ├── asyncHandler.ts
│   ├── hash.ts
│   ├── jwt.ts
│   ├── gradeCalculator.ts
│   └── pdfGenerator.ts
├── types/
│   └── express.d.ts    # Augments req with schoolId, user, plan
├── app.ts              # Express app + route mounting
└── server.ts           # HTTP server + graceful shutdown
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/IsraelRobTheProgrammer/school-ms.git
cd school-ms
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/school_ms"

JWT_ACCESS_SECRET="generate-with-node-crypto"
JWT_REFRESH_SECRET="generate-with-node-crypto"

PAYSTACK_SECRET_KEY="sk_test_xxxx"
PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
PAYSTACK_BASIC_MONTHLY_PLAN="PLN_xxxx"
PAYSTACK_BASIC_TERMLY_PLAN="PLN_xxxx"
PAYSTACK_PREMIUM_MONTHLY_PLAN="PLN_xxxx"
PAYSTACK_PREMIUM_TERMLY_PLAN="PLN_xxxx"
```

Generate JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed the database

```bash
pnpm db:seed
```

This creates:

- Super admin: `superadmin@schoolms.com` / `SuperAdmin123!`
- Demo school admin: `admin@demoacademy.com` / `Admin123!`
- Demo teacher: `teacher@demoacademy.com` / `Teacher123!`
- Demo student: `student@demoacademy.com` / `Student123!`

### 5. Start the development server

```bash
pnpm dev
```

API is available at: `http://localhost:5000/api/v1`

---

## Paystack Setup

Before billing works, create 4 plans on your [Paystack Dashboard](https://dashboard.paystack.com):

```
Settings → Plans → Create Plan

Name: Basic Monthly   | Interval: Monthly    | Amount: ₦10,000
Name: Basic Termly    | Interval: Quarterly  | Amount: ₦27,000
Name: Premium Monthly | Interval: Monthly    | Amount: ₦25,000
Name: Premium Termly  | Interval: Quarterly  | Amount: ₦67,500
```

Copy the `PLN_xxxx` codes into your `.env`.

For local webhook testing, use the [Paystack CLI](https://github.com/PaystackHQ/paystack-cli) or a tool like [ngrok](https://ngrok.com) to expose your local server.

---

## Deployment (Railway)

### 1. Create a Railway project

```bash
npm install -g @railway/cli
railway login
railway init
```

### 2. Add a PostgreSQL database

In the Railway dashboard: **New Service → Database → PostgreSQL**

Railway automatically sets `DATABASE_URL` in your environment.

### 3. Set environment variables

In Railway dashboard → your service → **Variables**, add all values from `.env.example`.

### 4. Set up GitHub Actions

In your GitHub repo → **Settings → Secrets → Actions**, add:

```
RAILWAY_TOKEN    # From railway.app → Account Settings → Tokens
```

### 5. Deploy

Push to `main` — the GitHub Actions pipeline handles the rest:

```bash
git push origin main
```

The pipeline will:

1. Type check TypeScript
2. Run a full build
3. Deploy to Railway
4. Railway runs `prisma migrate deploy` then starts the server

---

## Scripts

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Compile TypeScript → dist/
pnpm start        # Start compiled server (production)
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations (development)
pnpm db:push      # Push schema changes without migration file
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed the database
```

---

## User Roles

| Role           | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPER_ADMIN`  | SaaS owner — full access across all tenants                |
| `SCHOOL_ADMIN` | Manages their school — creates teachers, students, classes |
| `TEACHER`      | Views their classes, records attendance, enters grades     |
| `STUDENT`      | Read-only access to their own data                         |
| `PARENT`       | Premium — read-only access to their linked children's data |

---

## API Documentation

See /api-docs.

---

## License

MIT
