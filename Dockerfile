# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# Install all dependencies and compile TypeScript to JavaScript
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files first — Docker layer caching means pnpm install
# only re-runs when package.json or lockfile changes, not on every code change
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install ALL dependencies (including devDependencies — needed for tsc)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm db:generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
# Copy only what's needed to run — no TypeScript, no devDependencies
FROM node:20-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install PRODUCTION dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy Prisma schema and generated client
# The client is in node_modules but schema is needed for migrate deploy
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Don't run as root — security best practice
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Run migrations first, then start the server
# prisma migrate deploy is safe to run on every startup — it's idempotent
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
