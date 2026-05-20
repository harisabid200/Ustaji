# ─────────────────────────────────────────────────────────────────
# UstaJi Server — Production Dockerfile
# Multi-stage build: compile TypeScript in stage 1, run lean in stage 2
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first (layer cache: only re-runs npm ci if these change)
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for tsc)
RUN npm ci

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript → dist/
RUN npm run build


# ── Stage 2: Production runner ────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Create a non-root user for security (Cloud Run best practice)
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

# Copy package files and install PRODUCTION dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Cloud Run injects PORT as an environment variable (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Run as non-root
USER nodejs

# Healthcheck so Cloud Run knows the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
