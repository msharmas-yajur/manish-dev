# Tailscale Monitor - Cloudflare Worker

Web-based Tailscale node monitoring using Cloudflare Workers. Runs on a schedule and sends email alerts when nodes go offline.

**No local system required** - runs entirely in the cloud using the Tailscale API.

## Prerequisites

1. **Cloudflare account** (free tier works)
2. **Tailscale API key** - [Generate here](https://login.tailscale.com/admin/settings/keys)
3. **Resend account** - [Sign up](https://resend.com) (free tier: 3000 emails/month)

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. Clone and install dependencies

```bash
cd scripts/tailscale-monitor-cf
npm install
```

### 3. Create KV namespace

```bash
wrangler kv:namespace create TAILSCALE_STATE
```

Copy the output ID and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "TAILSCALE_STATE"
id = "paste-your-id-here"
```

### 4. Get your Tailscale API key

1. Go to [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys)
2. Click "Generate API key"
3. Copy the key (starts with `tskey-api-...`)

Your tailnet (`caladriusqa.tail5b7deb.ts.net`) is already configured in `wrangler.toml`.

### 5. Set up Resend

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain (or use their test domain for testing)
3. Create an API key

### 6. Configure secrets

```bash
# Required secrets
wrangler secret put TAILSCALE_API_KEY
# Paste your Tailscale API key (starts with tskey-api-...)

wrangler secret put RESEND_API_KEY
# Paste your Resend API key

wrangler secret put EMAIL_FROM
# e.g., alerts@yourdomain.com (must be verified in Resend)

wrangler secret put EMAIL_TO
# e.g., admin@example.com,team@example.com
```

### 7. Deploy

```bash
npm run deploy
```

## Usage

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | List available endpoints |
| `GET /status` | Current device status (JSON) |
| `GET /trigger` | Manually run the monitor |
| `GET /test-alert` | Send a test email |

### Cron Schedule

The worker runs automatically every 5 minutes (configured in `wrangler.toml`):

```toml
[triggers]
crons = ["*/5 * * * *"]
```

Adjust as needed:
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour

### View Logs

```bash
npm run tail
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TAILSCALE_API_KEY` | Yes | Tailscale API key (secret) |
| `TAILSCALE_TAILNET` | Yes | Your tailnet name (preconfigured: `caladriusqa.tail5b7deb.ts.net`) |
| `RESEND_API_KEY` | Yes | Resend.com API key (secret) |
| `EMAIL_FROM` | Yes | Sender email - verified in Resend (secret) |
| `EMAIL_TO` | Yes | Recipients, comma-separated (secret) |
| `IGNORED_NODES` | No | Hostnames to skip (comma-separated) |
| `ALERT_ON_RECOVERY` | No | Send recovery alerts (default: true) |

### Ignoring Nodes

Add to `wrangler.toml`:
```toml
[vars]
IGNORED_NODES = "test-node,dev-laptop,temp-server"
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Worker                     │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Cron Trigger│───▶│ Fetch from  │───▶│ Compare to  │ │
│  │ (every 5m)  │    │ Tailscale   │    │ KV State    │ │
│  └─────────────┘    │ API         │    └──────┬──────┘ │
│                     └─────────────┘           │        │
│                                               ▼        │
│                     ┌─────────────┐    ┌─────────────┐ │
│                     │ Update KV   │◀───│ Send Email  │ │
│                     │ State       │    │ via Resend  │ │
│                     └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Testing Locally

```bash
npm run dev
```

Then visit:
- http://localhost:8787/status
- http://localhost:8787/test-alert
- http://localhost:8787/trigger

## Cost

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **Cloudflare KV**: Free tier includes 100,000 reads/day, 1,000 writes/day
- **Resend**: Free tier includes 3,000 emails/month
- **Tailscale API**: Free, included with all plans

Running every 5 minutes = ~8,640 requests/month - well within free tiers.

## Alternative Email Providers

The code uses Resend, but you can modify `sendEmailAlert()` to use:

- **SendGrid**: Replace API endpoint with `https://api.sendgrid.com/v3/mail/send`
- **Mailgun**: Use `https://api.mailgun.net/v3/YOUR_DOMAIN/messages`
- **AWS SES**: Use `@aws-sdk/client-ses` (requires bundling)
