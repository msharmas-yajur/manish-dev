#!/usr/bin/env python3
"""
Tailscale Node Monitor

Monitors Tailscale peers and sends email alerts when nodes go offline/online.
Designed to run via cron (e.g., every 5 minutes).

Usage:
    1. Copy .env.example to .env and configure
    2. Run: python tailscale_monitor.py
    3. Add to cron: */5 * * * * /path/to/python /path/to/tailscale_monitor.py
"""

import json
import os
import smtplib
import subprocess
import sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Configuration (override via environment variables)
CONFIG = {
    "SMTP_HOST": os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "SMTP_PORT": int(os.getenv("SMTP_PORT", "587")),
    "SMTP_USER": os.getenv("SMTP_USER", ""),
    "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", ""),  # Use app password for Gmail
    "SMTP_USE_TLS": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    "EMAIL_FROM": os.getenv("EMAIL_FROM", ""),
    "EMAIL_TO": os.getenv("EMAIL_TO", ""),  # Comma-separated for multiple recipients
    "STATE_FILE": os.getenv("STATE_FILE", str(Path(__file__).parent / "node_state.json")),
    "ALERT_ON_RECOVERY": os.getenv("ALERT_ON_RECOVERY", "true").lower() == "true",
    "IGNORED_NODES": os.getenv("IGNORED_NODES", "").split(","),  # Comma-separated hostnames to ignore
}


def get_tailscale_status() -> dict:
    """Run tailscale status --json and return parsed JSON."""
    try:
        result = subprocess.run(
            ["tailscale", "status", "--json"],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running tailscale status: {e.stderr}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing tailscale JSON: {e}", file=sys.stderr)
        sys.exit(1)


def get_peer_status(status: dict) -> dict[str, dict]:
    """Extract peer information from tailscale status.

    Returns:
        Dict mapping hostname to {online: bool, ip: str, last_seen: str, os: str}
    """
    peers = {}
    peer_data = status.get("Peer", {})

    for peer_id, peer_info in peer_data.items():
        hostname = peer_info.get("HostName", peer_id)

        # Skip ignored nodes
        if hostname in CONFIG["IGNORED_NODES"]:
            continue

        peers[hostname] = {
            "online": peer_info.get("Online", False),
            "ip": peer_info.get("TailscaleIPs", ["N/A"])[0] if peer_info.get("TailscaleIPs") else "N/A",
            "last_seen": peer_info.get("LastSeen", "Unknown"),
            "os": peer_info.get("OS", "Unknown"),
            "exit_node": peer_info.get("ExitNode", False),
        }

    return peers


def load_previous_state() -> dict:
    """Load previous node state from file."""
    state_file = Path(CONFIG["STATE_FILE"])
    if state_file.exists():
        try:
            with open(state_file) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_current_state(peers: dict) -> None:
    """Save current node state to file."""
    state_file = Path(CONFIG["STATE_FILE"])
    state = {hostname: {"online": info["online"]} for hostname, info in peers.items()}
    state["_last_check"] = datetime.now().isoformat()

    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)


def detect_changes(previous: dict, current: dict) -> tuple[list, list]:
    """Detect nodes that went offline or came back online.

    Returns:
        (went_offline, came_online) - Lists of (hostname, info) tuples
    """
    went_offline = []
    came_online = []

    for hostname, info in current.items():
        prev_online = previous.get(hostname, {}).get("online", True)  # Assume online if new
        curr_online = info["online"]

        if prev_online and not curr_online:
            went_offline.append((hostname, info))
        elif not prev_online and curr_online:
            came_online.append((hostname, info))

    return went_offline, came_online


def send_email(subject: str, body_html: str, body_text: str) -> bool:
    """Send email via SMTP."""
    if not all([CONFIG["SMTP_USER"], CONFIG["SMTP_PASSWORD"], CONFIG["EMAIL_TO"]]):
        print("Email not configured, skipping notification", file=sys.stderr)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = CONFIG["EMAIL_FROM"] or CONFIG["SMTP_USER"]
    msg["To"] = CONFIG["EMAIL_TO"]

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(CONFIG["SMTP_HOST"], CONFIG["SMTP_PORT"]) as server:
            if CONFIG["SMTP_USE_TLS"]:
                server.starttls()
            server.login(CONFIG["SMTP_USER"], CONFIG["SMTP_PASSWORD"])
            recipients = [email.strip() for email in CONFIG["EMAIL_TO"].split(",")]
            server.sendmail(msg["From"], recipients, msg.as_string())
        return True
    except Exception as e:
        print(f"Failed to send email: {e}", file=sys.stderr)
        return False


def build_alert_email(went_offline: list, came_online: list) -> tuple[str, str, str]:
    """Build email subject and body for node status changes."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Subject
    parts = []
    if went_offline:
        parts.append(f"{len(went_offline)} node(s) OFFLINE")
    if came_online:
        parts.append(f"{len(came_online)} node(s) recovered")
    subject = f"[Tailscale] {' | '.join(parts)}"

    # HTML body
    html_parts = [f"<h2>Tailscale Network Status Change</h2><p>Detected at: {timestamp}</p>"]

    if went_offline:
        html_parts.append("<h3 style='color: #dc3545;'>Nodes Offline</h3><table border='1' cellpadding='8'>")
        html_parts.append("<tr><th>Hostname</th><th>IP</th><th>OS</th><th>Last Seen</th></tr>")
        for hostname, info in went_offline:
            html_parts.append(
                f"<tr><td><strong>{hostname}</strong></td><td>{info['ip']}</td>"
                f"<td>{info['os']}</td><td>{info['last_seen']}</td></tr>"
            )
        html_parts.append("</table>")

    if came_online:
        html_parts.append("<h3 style='color: #28a745;'>Nodes Recovered</h3><table border='1' cellpadding='8'>")
        html_parts.append("<tr><th>Hostname</th><th>IP</th><th>OS</th></tr>")
        for hostname, info in came_online:
            html_parts.append(
                f"<tr><td><strong>{hostname}</strong></td><td>{info['ip']}</td>"
                f"<td>{info['os']}</td></tr>"
            )
        html_parts.append("</table>")

    html_body = "\n".join(html_parts)

    # Plain text body
    text_parts = [f"Tailscale Network Status Change\nDetected at: {timestamp}\n"]

    if went_offline:
        text_parts.append("\n--- NODES OFFLINE ---")
        for hostname, info in went_offline:
            text_parts.append(f"  {hostname} ({info['ip']}) - {info['os']} - Last seen: {info['last_seen']}")

    if came_online:
        text_parts.append("\n--- NODES RECOVERED ---")
        for hostname, info in came_online:
            text_parts.append(f"  {hostname} ({info['ip']}) - {info['os']}")

    text_body = "\n".join(text_parts)

    return subject, html_body, text_body


def main():
    """Main monitoring loop."""
    print(f"[{datetime.now().isoformat()}] Checking Tailscale status...")

    # Get current status
    status = get_tailscale_status()
    current_peers = get_peer_status(status)

    # Load previous state
    previous_state = load_previous_state()

    # Detect changes
    went_offline, came_online = detect_changes(previous_state, current_peers)

    # Filter out recovery alerts if disabled
    if not CONFIG["ALERT_ON_RECOVERY"]:
        came_online = []

    # Print summary
    online_count = sum(1 for p in current_peers.values() if p["online"])
    offline_count = len(current_peers) - online_count
    print(f"  Peers: {len(current_peers)} total, {online_count} online, {offline_count} offline")

    if went_offline:
        print(f"  ALERT: {len(went_offline)} node(s) went offline: {[h for h, _ in went_offline]}")
    if came_online:
        print(f"  INFO: {len(came_online)} node(s) came back online: {[h for h, _ in came_online]}")

    # Send email if there are changes
    if went_offline or came_online:
        subject, html_body, text_body = build_alert_email(went_offline, came_online)
        if send_email(subject, html_body, text_body):
            print("  Email notification sent successfully")
        else:
            print("  Failed to send email notification")
    else:
        print("  No status changes detected")

    # Save current state
    save_current_state(current_peers)
    print("  State saved")


if __name__ == "__main__":
    main()
