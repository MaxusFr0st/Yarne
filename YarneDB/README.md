# Yarne Database

## Seed data

Product seed data is sourced from `YarneFront/src/app/data/products.ts` — Arles Cocoon, Mistral Turtleneck, Provence Vest, Bretagne Pullover, Riviera Cardigan, and Côte Bouclé Jacket, with their colors and Unsplash images.

## Persistence

- **Data is preserved** across `docker compose down` / `docker compose up`. The `sql_data` volume keeps the database files.
- **Init runs only when the database does not exist.** If `Yarne1.0` already exists, init is skipped and your data is kept.

## Reset database (fresh install)

To wipe all data and recreate from `SQLQuery1.sql` (including the products.ts seed):

1. Stop and remove containers **and volumes**:
   ```bash
   docker compose down -v
   ```
2. Start again:
   ```bash
   docker compose up -d
   ```

Using `-v` removes the `sql_data` volume, so on next `up` the database will be missing and init will run the full schema + seed script.
