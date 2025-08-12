# 1️⃣ Build stage
FROM node:20-alpine AS builder

# Set working directory inside container
WORKDIR /app

# Copy package files first for better build cache
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (use npm ci for reproducible builds)
RUN npm ci

# Copy rest of the source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js for production
RUN npm run build

# 2️⃣ Production stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.* ./
COPY --from=builder /app/uploads ./uploads

# Expose app port
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]
