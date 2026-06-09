# Multi-stage build for the Next.js web app.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build && pnpm --filter @rocket/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "@rocket/web", "start"]
