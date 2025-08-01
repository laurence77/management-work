# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build application (if you have a build step)
RUN npm run build || echo "No build step defined"

# Remove dev dependencies
RUN npm prune --production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install security updates and runtime packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./
COPY --from=build --chown=nodejs:nodejs /app/config ./config
COPY --from=build --chown=nodejs:nodejs /app/middleware ./middleware
COPY --from=build --chown=nodejs:nodejs /app/routes ./routes
COPY --from=build --chown=nodejs:nodejs /app/services ./services
COPY --from=build --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=build --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=build --chown=nodejs:nodejs /app/*.js ./

# Create necessary directories
RUN mkdir -p logs uploads backups && \
    chown -R nodejs:nodejs logs uploads backups

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "unified-server.js"]