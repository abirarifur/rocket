# Next.js web app (standalone). Build context is the frontend/ folder.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
# NEXT_PUBLIC_* values are inlined at build time, so the browser-facing API URL
# must be provided here (defaults to the host-published API port).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY package.json ./
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
# next start may write to .next/cache, so the runtime user needs to own it.
RUN chown -R node:node /app/.next
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3001/ || exit 1
CMD ["pnpm", "start"]
