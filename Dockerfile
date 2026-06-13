# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# Install all dependencies and compile TypeScript to JavaScript
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy schema / config files first
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install ALL dependencies (needed for tsc)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm db:generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Prune devDependencies after building, leaving only production modules
# This preserves the exact .prisma structure generated in node_modules
RUN pnpm prune --prod

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
# Copy only what's needed to run — no TypeScript, no devDependencies
FROM node:20-alpine AS runner

WORKDIR /app

# Non-root user setup (ensure proper permissions)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files (needed for runtime metadata, scripts)
COPY package.json ./

# Copy the pre-pruned, production-ready node_modules from builder stage
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy compiled output and Prisma configurations
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser
EXPOSE 5000

# Run migrations, then start the server
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/server.js"]