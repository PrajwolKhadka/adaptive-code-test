# Multi-stage build for smaller, more secure production image
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root user (defense against container breakout escalation)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

USER appuser
EXPOSE 5000
CMD ["node", "dist/server.js"]
