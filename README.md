# Yarné

Yarné is a vertically integrated production-to-sale system for a small yarn and textile manufacturer. It covers the operational side of the business — procurement, production, accounting, sales, and returns — alongside a customer-facing storefront, in one platform. It is not just an e-commerce site: the admin side is a small ERP built around the shop's actual product and order data, and the storefront is one consumer of that same backend.

This repository was built as a bachelor's thesis project in software engineering.

## Repository layout

| Path | What it is |
|------|------------|
| `YarneFront/` | React 18 + Vite + TypeScript SPA — storefront and admin UI |
| `YarneBack/YarneAPIBack/` | .NET 9 Web API — accounting/ERP logic, catalog, orders, auth |
| `YarneDB/` | SQL Server schema scripts used for local Docker development |
| `docs/` | Operational notes (e.g. database backup procedure) |
| `guidelines/` | Project development guidelines |
| `DOCKER_README.md` | Local Docker Compose setup (SQL Server + API) |
| `RAILWAY_DEPLOY.md` | Production deployment runbook (Railway + PostgreSQL) |

## Features

### Storefront
- Product catalog with categories, collections, colors, and sizes
- Product detail pages with per-color image galleries and a focal-point-aware crop so thumbnails stay centered on the product
- Checkout flow with Nova Poshta (Ukrainian carrier) delivery integration
- Order confirmation emails
- Account page for order history
- Ukrainian and English localization (`i18n`, driven by `en.ts` / `uk.ts` locale files)
- Installable PWA with an offline app-shell fallback (see PWA section below)

### Admin / ERP
- **Procurement** — recording incoming raw materials
- **Production** — tracking production runs
- **Sales** — order and sales records tied into accounting
- **Returns** — processing and recording returned orders
- **Operating expenses** — with an offline-capable entry queue (see below)
- **Reports** — an accounting dashboard (`AccountingReportsV3Controller`) summarizing the above over a date range
- Product, category, collection, color, and size management, including image upload
- Storefront settings management
- Admin activity log (audit trail of admin actions)
- Admin user management and a one-time bootstrap endpoint for creating the first admin account

### Auth & security
- JWT-based authentication with refresh tokens (`AuthService`, `RefreshTokenService`, `AccessTokenIssuer`)
- OAuth login support (`OAuthService`)
- Role-based authorization (Admin-gated accounting and admin routes)
- Admin activity logging for traceability of privileged actions

### Infrastructure & integrations
- **Image storage** — Cloudflare R2 (`R2ImageStorageService`), with upload normalization to WebP (`ImageUploadNormalizer`) and automatic focal-point detection for cropping (`FocalPointDetector`, `FocalPointBackfill`)
- **Shipping** — Nova Poshta API integration (`NovaPoshtaService`) for Ukrainian delivery
- **Email** — transactional email via Resend or SMTP (`ResendEmailService`, `SmtpEmailService`), with order confirmation emails built by `OrderConfirmationEmailBuilder`
- **Currency formatting** — Ukrainian hryvnia formatting (`HryvniaPriceFormatter`)

### PWA & offline behavior
The frontend is a partial PWA, not a fully offline-first app:
- Installable via `manifest.webmanifest` (standalone display, app icons)
- A service worker (`public/sw.js`) caches the app shell and falls back to the cached `index.html` when a navigation request fails, so the app still loads its shell without a network connection
- `/api/` and Cloudflare (`/cdn-cgi/`) requests always go to the network — API data and images are not cached offline
- One specific offline-capable flow: operating-expense entries made by an admin while offline are queued in IndexedDB (`YarneFront/src/app/offline/expenseQueue.ts`) and synced when the connection returns

The storefront and catalog browsing require a live connection; there is no general offline catalog or checkout support.

## Architecture / tech stack

**Frontend** (`YarneFront/`)
- React 18, TypeScript, Vite
- Tailwind CSS, Radix UI primitives, MUI components
- react-router for routing, react-hook-form for forms, i18next for localization

**Backend** (`YarneBack/YarneAPIBack/`)
- .NET 9 Web API, Entity Framework Core
- JWT authentication, role-based authorization

**Database**
- Production (Railway): PostgreSQL, schema managed by EF Core migrations applied on API startup
- Local Docker development: SQL Server 2022, schema applied from `YarneDB/SQLQuery1.sql`
- `YarneDB/Migrations/` also contains a set of numbered SQL migration scripts (product images, color/size models, admin promotion, product suggestions) used for incremental schema changes on the SQL Server path

**Image storage**: Cloudflare R2
**Shipping**: Nova Poshta API
**Email**: Resend API or SMTP
**Deployment**: Docker Compose locally, Railway in production (see below)

## Testing

The backend has a small xUnit test project (`YarneBack/YarneAPIBack/YarneAPIBack.Tests/`) covering specific units: admin bootstrap, hryvnia price formatting, order confirmation email building, order item snapshot helpers, product data "polishing," and the SMTP email service. Coverage is not comprehensive — treat it as targeted regression protection for a handful of trickier code paths, not a full test suite.

## Getting started (local development)

### 1. Database
Local development runs against SQL Server via Docker (see [DOCKER_README.md](./DOCKER_README.md) for the full guide, including troubleshooting). In short, from `YarneBack/YarneAPIBack`:
```bash
docker compose up -d --build
```
This starts SQL Server, runs the schema/seed script, and starts the API on port 8080.

### 2. Backend only (without Docker)
Run the API directly with `dotnet run` (or F5 in Visual Studio) from `YarneBack/YarneAPIBack/YarneAPIBack`. It listens on `http://localhost:5000` by default and serves Swagger at `/swagger`.

### 3. Frontend
```bash
cd YarneFront
npm install
npm run dev
```
Point it at whichever API is running:
- Docker API (port 8080): default, or set `VITE_API_URL=http://localhost:8080`
- Local `dotnet run` (port 5000): create `.env` with `VITE_API_URL=http://localhost:5000`

## Deployment

- Local Docker Compose: [DOCKER_README.md](./DOCKER_README.md)
- Production (Railway, PostgreSQL, three services — Postgres, API, frontend): [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

## Attributions

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party UI components and assets used in the original design.
