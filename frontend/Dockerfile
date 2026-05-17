# Stage 1: Build the React application
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG VITE_API_URL=https://api.flarq.ai

# Set environment variable for build
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 8080 (required by Google Cloud Run)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
