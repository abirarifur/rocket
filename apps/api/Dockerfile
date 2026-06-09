# Multi-stage build for the NestJS API service.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build \
 && pnpm --filter @rocket/api prisma:generate \
 && pnpm --filter @rocket/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
