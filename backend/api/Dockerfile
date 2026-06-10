# NestJS API service. Build context is the backend/ workspace root.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build \
 && pnpm --filter @rocket/api prisma:generate \
 && pnpm --filter @rocket/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
RUN chmod +x /app/api/docker-entrypoint.sh
EXPOSE 4000
# Runs as root because the entrypoint applies DB migrations on boot; in k8s
# prefer an init-container for migrations and drop privileges for the server.
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["/app/api/docker-entrypoint.sh"]
