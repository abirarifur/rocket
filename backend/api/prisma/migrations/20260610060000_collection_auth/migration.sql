-- Collection-level authorization (inherited by requests with auth type "inherit").
ALTER TABLE "Collection" ADD COLUMN "auth" JSONB;
