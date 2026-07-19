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

# python3 is required by src/services/execution.service.ts to run student
# code submissions. See that file's header comment for the documented
# scope/limitations of this execution approach.
RUN apk add --no-cache python3

# Run as non-root user (defense against container breakout escalation)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

USER appuser
EXPOSE 5001
CMD ["node", "dist/server.js"]