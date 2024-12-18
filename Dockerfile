# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install OpenSSL 1.1.1
RUN apt-get update -y && \
    apt-get install -y openssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client (in deps stage)
RUN npx prisma generate

# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL 1.1
RUN apt-get update -y && \
    apt-get install -y openssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL 1.1
RUN apt-get update -y && \
    apt-get install -y openssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs --ingroup nodejs

# Copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Generate Prisma Client (in runner stage)
USER root
RUN npx prisma generate
USER nextjs

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
