# Multi-stage build for the Request Proxy service.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/proxy ./apps/proxy
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build && pnpm --filter @rocket/proxy build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4100
CMD ["node", "apps/proxy/dist/main.js"]
