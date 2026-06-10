# Script Runner service. Build context is the backend/ workspace root.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build && pnpm --filter @rocket/runner build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
USER node
EXPOSE 4200
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4200/health || exit 1
CMD ["node", "/app/runner/dist/main.js"]
