# Multi-stage build for the Next.js web app.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* values are inlined at build time, so the browser-facing API URL
# must be provided here (defaults to the host-published API port).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build && pnpm --filter @rocket/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@rocket/web", "start"]
