-- PostgreSQL: adds SuggestionsConfigured flag for per-product related product tri-state behavior.
-- Apply when using EF migrations against PostgreSQL (matches Npgsql stack).
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "SuggestionsConfigured" boolean NOT NULL DEFAULT false;
