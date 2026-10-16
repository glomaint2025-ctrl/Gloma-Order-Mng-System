# Gloma Shop Portal

A back-office portal for Gloma International's partner shops. It covers invested stock, orders, couriers, COD, returns, money and reports. There is no storefront.

| Part | Where | Status |
|---|---|---|
| Planning docs | `docs/` (00–09, DECISIONS, API) | done |
| Backend API (Laravel 12, PHP 8.2+) | `backend/` | phase 1 done, 106 tests green (SQLite + MySQL) |
| Frontend (React 19 + TS + Vite) | `frontend/` | phase 1 done, 32 tests green, lint clean |
| CI/CD | `.github/workflows/ci-cd.yml`, `deploy/` | ready, needs a GitHub remote + server secrets |

## Quick start (backend)
```bash
cd backend
php ../tools/composer.phar install      # or: composer install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed --seeder=DemoSeeder
php artisan serve                        # http://localhost:8000/api/v1/health
```
Demo logins (password `password`): `admin@gloma.test`, `owner@gloma.test`.
Docker alternative (MySQL 8 + Mailpit): `docker compose up -d --build`.

## Frontend (dev)
```bash
cd frontend && pnpm install && pnpm dev   # http://localhost:5173 (proxies /api to :8000)
```
`pnpm build` writes the production SPA into `backend/public/app` (served by Laravel).

## Quality bar
```bash
cd backend && php ../tools/composer.phar run quality   # pint + larastan + pest
cd frontend && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Read `CLAUDE.md` before contributing.
