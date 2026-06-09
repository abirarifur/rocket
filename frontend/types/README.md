# frontend/types

These are **shared API contract types** (Zod schemas for requests, collections,
environments, and the proxy) imported in the frontend as `@rocket/types`.

The source of truth lives in **`backend/shared/src`**. This folder is a copy so the
frontend can stay an independent project with its own install.

To re-sync after changing the backend contracts, run from the repo root:

```bash
pnpm sync:types     # copies backend/shared/src/*.ts -> frontend/types/
```
