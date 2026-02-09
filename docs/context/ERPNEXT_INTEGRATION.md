# Frappe/ERPNext Integration

## Architecture
- **Image**: `frappe/erpnext:v16` (Frappe 16.5.0, ERPNext 16.4.1)
- **Entry point**: http://localhost:8090
- **Login**: `Administrator` / `admin123456`
- **Database**: Dedicated MariaDB 10.6 (`manish-frappe-db`, port 3308)
- **Redis**: Shared with app stack — DB 1 (cache), DB 2 (queue), DB 3 (socketio)
- **Config**: `infrastructure/frappe/mariadb.cnf` — enforces utf8mb4 charset

## Installed Apps
| App | Version | Branch |
|-----|---------|--------|
| Frappe | 16.5.0 | — |
| ERPNext | 16.4.1 | — |
| Healthcare | 16.0.3 | version-16 |

## Container Services
| Container | Role |
|-----------|------|
| `manish-frappe-db` | MariaDB 10.6 (Frappe-dedicated) |
| `manish-frappe-configurator` | One-time init (writes common_site_config.json) |
| `manish-frappe-backend` | Gunicorn app server (internal) |
| `manish-frappe-frontend` | Nginx reverse proxy (port 8090) |
| `manish-frappe-websocket` | Socket.IO real-time updates |
| `manish-frappe-queue-short` | Short/default background jobs |
| `manish-frappe-queue-long` | Long-running background jobs |
| `manish-frappe-scheduler` | Cron/scheduled tasks |

## Shared Volumes
All Frappe containers share these volumes so `bench get-app` installs are visible everywhere:
- `frappe_sites` — `/home/frappe/frappe-bench/sites`
- `frappe_logs` — `/home/frappe/frappe-bench/logs`
- `frappe_apps` — `/home/frappe/frappe-bench/apps`
- `frappe_env` — `/home/frappe/frappe-bench/env`

## First-Time Setup (Already Completed)
```bash
# After docker compose up -d, wait for frappe-configurator to exit cleanly, then:

# Create site
docker exec manish-frappe-backend bench new-site erpnext.localhost \
  --mariadb-root-password frappe_secret \
  --admin-password admin123456

# Set default site
docker exec manish-frappe-backend bench use erpnext.localhost

# Install ERPNext
docker exec manish-frappe-backend bench --site erpnext.localhost install-app erpnext

# Install Healthcare module (MUST use version-16 branch)
docker exec manish-frappe-backend bench get-app healthcare --branch version-16
docker exec manish-frappe-backend bench --site erpnext.localhost install-app healthcare

# Enable scheduler
docker exec manish-frappe-backend bench --site erpnext.localhost enable-scheduler
```

## Key Gotchas
- **Gunicorn path**: Must use `/home/frappe/frappe-bench/env/bin/gunicorn` (not bare `gunicorn`) — it's not in PATH
- **Site name header**: `FRAPPE_SITE_NAME_HEADER` must be `erpnext.localhost` (not `$$host`) for localhost access
- **Health check**: Backend health check must include `-H "Host: erpnext.localhost"` in curl
- **Healthcare branch**: `develop` branch is incompatible with ERPNext v16 — use `--branch version-16`
- **"All Customer Groups" error**: Non-blocking during healthcare install — resolved during setup wizard

## Bidirectional Patient Sync

### Decision: BFF as Sole Integration Gateway
- **Date**: Feb 2026
- **Context**: Sync Patient entities between Caladrius (clinical/ABDM) and ERPNext (CRM/billing)
- **Choice**: BFF as sole integration gateway, ABHA ID as sync key, Frappe REST API + webhooks
- **Rationale**:
  - Loose coupling — each system works independently
  - BFF centralizes all sync logic (no direct backend-to-Frappe calls)
  - Async sync via frappe.enqueue — non-blocking
  - Infinite loop prevention via custom_caladrius_id flag + doc.flags
- **Frappe Custom App**: caladrius_integration (hooks.py + sync/patient.py)
- **Auth**: Dedicated API user with token-based auth (not OAuth)

### Sync Details
- **Direction**: Bidirectional (Caladrius <-> ERPNext)
- **Sync Key**: ABHA ID (`abha_id` in PostgreSQL, `custom_abha_id` in ERPNext)
- **Custom App**: `caladrius_integration` (hooks.py + sync/patient.py)
- **Custom Fields on Patient DocType**: `custom_abha_id`, `custom_abha_address`, `custom_caladrius_id`, `custom_aadhaar_last4`
- **API User**: `caladrius-sync@erpnext.localhost` (Healthcare Administrator + Physician + System Manager roles)
- **Webhook**: ERPNext → BFF `POST /api/sync/webhook/erpnext/patient` (X-Webhook-Secret auth)
- **Auto-creates** Customer record in ERPNext for billing (via `ensure_customer_for_patient` hook)
- **Loop Prevention**: BFF sets `custom_caladrius_id` on ERPNext create → Frappe hook skips webhook if present

### Implementation Phases (All Complete)
1. **Phase 1**: PostgreSQL schema migration — 10 new columns on `patients` table + 3 indexes
2. **Phase 2**: FastAPI model updates — PatientCreate/PatientResponse models, 2 new lookup endpoints
3. **Phase 3**: BFF sync service — `frappeClient.ts` (226 lines), `patientSync.ts` (417 lines), `sync.ts` (144 lines)
4. **Phase 4**: Frappe custom app `caladrius_integration` — hooks.py (doc_events), sync/patient.py (webhook dispatch, Customer auto-creation)
5. **Phase 5**: ERPNext custom fields — 4 fields on Patient DocType
6. **Phase 6**: API user `caladrius-sync@erpnext.localhost` with token auth, site config for BFF URL + webhook secret
- **Verified**: End-to-end sync tested — loop prevention working, Customer auto-created for billing

### Environment Variables
- `FRAPPE_DB_PASSWORD` — MariaDB root + app password (default: `frappe_secret`)
- `FRAPPE_ADMIN_PASSWORD` — ERPNext admin UI password
- `FRAPPE_SITE_NAME` — site name (default: `erpnext.localhost`)
- `FRAPPE_API_KEY` / `FRAPPE_API_SECRET` — Frappe token auth for patient sync
- `FRAPPE_WEBHOOK_SECRET` — Shared secret for ERPNext webhook verification
- `FRAPPE_OAUTH_CLIENT_ID` / `FRAPPE_OAUTH_CLIENT_SECRET` — Frappe OAuth
- `FRAPPE_URL` / `FRAPPE_INTERNAL_URL` / `FRAPPE_CALLBACK_URL` — Frappe OAuth URLs
