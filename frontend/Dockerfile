# Multi-stage build. NEXT_PUBLIC_* vars are inlined into the JS bundle at
# BUILD time by Next.js, not read at container startup — so they must be
# passed as build args (see docker-compose.yml), not just environment
# variables on the running container, or the frontend will silently keep
# whatever URL it was built with.
FROM node:20-alpine AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_HCAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_HCAPTCHA_SITE_KEY=${NEXT_PUBLIC_HCAPTCHA_SITE_KEY}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./next.config.js

USER appuser
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]