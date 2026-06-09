# Request Proxy service. Build context is the backend/ workspace root.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @rocket/types build && pnpm --filter @rocket/proxy build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4100
CMD ["node", "/app/proxy/dist/main.js"]
