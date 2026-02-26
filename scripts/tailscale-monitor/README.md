# Tailscale Node Monitor

Monitors Tailscale peers and sends email alerts when nodes go offline or recover.

## Setup

1. **Install Tailscale** (if not already installed)
   ```bash
   # macOS
   brew install tailscale

   # Linux
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Configure environment**
   ```bash
   cd scripts/tailscale-monitor
   cp .env.example .env
   # Edit .env with your SMTP credentials
   ```

3. **For Gmail users**: Create an App Password
   - Go to https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Use this password in `SMTP_PASSWORD` (not your regular Gmail password)

4. **Test the script**
   ```bash
   # Load environment variables
   export $(cat .env | xargs)

   # Run monitor
   python tailscale_monitor.py
   ```

## Cron Setup

Add to crontab to run every 5 minutes:

```bash
crontab -e
```

Add this line (adjust paths):
```cron
*/5 * * * * cd /path/to/tailscale-monitor && /usr/bin/env $(cat .env | xargs) /usr/bin/python3 tailscale_monitor.py >> /var/log/tailscale-monitor.log 2>&1
```

Or with a wrapper script:
```bash
# Create wrapper
cat > run_monitor.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
export $(cat .env | grep -v '^#' | xargs)
python3 tailscale_monitor.py
EOF
chmod +x run_monitor.sh

# Add to cron
*/5 * * * * /path/to/tailscale-monitor/run_monitor.sh >> /var/log/tailscale-monitor.log 2>&1
```

## How It Works

1. Runs `tailscale status --json` to get peer status
2. Compares against previous state stored in `node_state.json`
3. Sends email alerts for:
   - Nodes that went **offline** (always)
   - Nodes that **recovered** (configurable via `ALERT_ON_RECOVERY`)
4. Saves current state for next run

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | smtp.gmail.com | SMTP server hostname |
| `SMTP_PORT` | 587 | SMTP server port |
| `SMTP_USER` | | SMTP username/email |
| `SMTP_PASSWORD` | | SMTP password or app password |
| `SMTP_USE_TLS` | true | Enable STARTTLS |
| `EMAIL_FROM` | (uses SMTP_USER) | Sender email address |
| `EMAIL_TO` | | Recipient(s), comma-separated |
| `STATE_FILE` | ./node_state.json | Path to state file |
| `ALERT_ON_RECOVERY` | true | Send alerts when nodes recover |
| `IGNORED_NODES` | | Hostnames to ignore, comma-separated |

## Sample Output

```
[2026-02-25T10:30:00] Checking Tailscale status...
  Peers: 5 total, 4 online, 1 offline
  ALERT: 1 node(s) went offline: ['server-02']
  Email notification sent successfully
  State saved
```

## Email Format

Emails include:
- Timestamp of detection
- Table of offline nodes (hostname, IP, OS, last seen)
- Table of recovered nodes (if enabled)
