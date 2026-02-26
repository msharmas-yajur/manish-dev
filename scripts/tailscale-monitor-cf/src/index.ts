/**
 * Tailscale Monitor - Cloudflare Worker
 *
 * Monitors Tailscale devices via API and sends email alerts when nodes go offline.
 * Runs on a cron schedule (configured in wrangler.toml).
 */

interface Env {
  // KV namespace for storing state
  TAILSCALE_STATE: KVNamespace;

  // Tailscale API
  TAILSCALE_API_KEY: string;
  TAILSCALE_TAILNET: string; // e.g., "your-email@gmail.com" or org name

  // Email settings (using Resend - simple API, free tier)
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_TO: string; // Comma-separated

  // Optional
  IGNORED_NODES?: string; // Comma-separated hostnames
  ALERT_ON_RECOVERY?: string; // "true" or "false"
}

interface TailscaleDevice {
  id: string;
  name: string;
  hostname: string;
  clientVersion: string;
  os: string;
  addresses: string[];
  lastSeen: string;
  online: boolean;
}

interface TailscaleResponse {
  devices: TailscaleDevice[];
}

interface NodeState {
  online: boolean;
}

interface StoredState {
  nodes: Record<string, NodeState>;
  lastCheck: string;
}

interface NodeInfo {
  hostname: string;
  online: boolean;
  ip: string;
  os: string;
  lastSeen: string;
}

// Main scheduled handler
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[${new Date().toISOString()}] Running Tailscale monitor...`);

    try {
      // Fetch current device status from Tailscale API
      const devices = await fetchTailscaleDevices(env);
      const currentNodes = parseDevices(devices, env.IGNORED_NODES);

      // Load previous state from KV
      const previousState = await loadState(env);

      // Detect changes
      const { wentOffline, cameOnline } = detectChanges(previousState, currentNodes);

      // Filter recovery alerts if disabled
      const alertOnRecovery = env.ALERT_ON_RECOVERY !== "false";
      const reportCameOnline = alertOnRecovery ? cameOnline : [];

      // Log summary
      const onlineCount = Object.values(currentNodes).filter((n) => n.online).length;
      console.log(
        `  Devices: ${Object.keys(currentNodes).length} total, ${onlineCount} online, ${Object.keys(currentNodes).length - onlineCount} offline`
      );

      if (wentOffline.length > 0) {
        console.log(`  ALERT: ${wentOffline.length} node(s) went offline`);
      }
      if (reportCameOnline.length > 0) {
        console.log(`  INFO: ${reportCameOnline.length} node(s) recovered`);
      }

      // Send email if there are changes
      if (wentOffline.length > 0 || reportCameOnline.length > 0) {
        await sendEmailAlert(env, wentOffline, reportCameOnline);
        console.log("  Email notification sent");
      } else {
        console.log("  No status changes detected");
      }

      // Save current state
      await saveState(env, currentNodes);
      console.log("  State saved");
    } catch (error) {
      console.error("Monitor failed:", error);
      throw error;
    }
  },

  // HTTP handler for manual testing
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/status") {
      try {
        const devices = await fetchTailscaleDevices(env);
        const currentNodes = parseDevices(devices, env.IGNORED_NODES);
        const previousState = await loadState(env);

        const onlineCount = Object.values(currentNodes).filter((n) => n.online).length;

        return Response.json({
          success: true,
          timestamp: new Date().toISOString(),
          summary: {
            total: Object.keys(currentNodes).length,
            online: onlineCount,
            offline: Object.keys(currentNodes).length - onlineCount,
          },
          devices: currentNodes,
          lastCheck: previousState?.lastCheck || null,
        });
      } catch (error) {
        return Response.json({ success: false, error: String(error) }, { status: 500 });
      }
    }

    if (url.pathname === "/test-alert") {
      // Send a test email
      try {
        await sendEmailAlert(
          env,
          [{ hostname: "test-node", online: false, ip: "100.x.x.x", os: "linux", lastSeen: new Date().toISOString() }],
          []
        );
        return Response.json({ success: true, message: "Test email sent" });
      } catch (error) {
        return Response.json({ success: false, error: String(error) }, { status: 500 });
      }
    }

    if (url.pathname === "/trigger") {
      // Manually trigger the monitor
      await this.scheduled({} as ScheduledEvent, env, ctx);
      return Response.json({ success: true, message: "Monitor triggered" });
    }

    return Response.json({
      endpoints: {
        "/status": "Get current device status",
        "/test-alert": "Send a test email alert",
        "/trigger": "Manually trigger the monitor",
      },
    });
  },
};

async function fetchTailscaleDevices(env: Env): Promise<TailscaleDevice[]> {
  const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${env.TAILSCALE_TAILNET}/devices`, {
    headers: {
      Authorization: `Bearer ${env.TAILSCALE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tailscale API error: ${response.status} - ${text}`);
  }

  const data: TailscaleResponse = await response.json();
  return data.devices;
}

function parseDevices(devices: TailscaleDevice[], ignoredNodes?: string): Record<string, NodeInfo> {
  const ignored = new Set((ignoredNodes || "").split(",").filter(Boolean));
  const nodes: Record<string, NodeInfo> = {};

  for (const device of devices) {
    const hostname = device.hostname || device.name;

    if (ignored.has(hostname)) {
      continue;
    }

    nodes[hostname] = {
      hostname,
      online: device.online,
      ip: device.addresses?.[0] || "N/A",
      os: device.os || "Unknown",
      lastSeen: device.lastSeen,
    };
  }

  return nodes;
}

async function loadState(env: Env): Promise<StoredState | null> {
  const data = await env.TAILSCALE_STATE.get("node_state", "json");
  return data as StoredState | null;
}

async function saveState(env: Env, nodes: Record<string, NodeInfo>): Promise<void> {
  const state: StoredState = {
    nodes: Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, { online: v.online }])),
    lastCheck: new Date().toISOString(),
  };
  await env.TAILSCALE_STATE.put("node_state", JSON.stringify(state));
}

function detectChanges(
  previous: StoredState | null,
  current: Record<string, NodeInfo>
): { wentOffline: NodeInfo[]; cameOnline: NodeInfo[] } {
  const wentOffline: NodeInfo[] = [];
  const cameOnline: NodeInfo[] = [];

  const prevNodes = previous?.nodes || {};

  for (const [hostname, info] of Object.entries(current)) {
    const wasOnline = prevNodes[hostname]?.online ?? true; // Assume online if new
    const isOnline = info.online;

    if (wasOnline && !isOnline) {
      wentOffline.push(info);
    } else if (!wasOnline && isOnline) {
      cameOnline.push(info);
    }
  }

  return { wentOffline, cameOnline };
}

async function sendEmailAlert(env: Env, wentOffline: NodeInfo[], cameOnline: NodeInfo[]): Promise<void> {
  const timestamp = new Date().toISOString();

  // Build subject
  const parts: string[] = [];
  if (wentOffline.length > 0) {
    parts.push(`${wentOffline.length} node(s) OFFLINE`);
  }
  if (cameOnline.length > 0) {
    parts.push(`${cameOnline.length} node(s) recovered`);
  }
  const subject = `[Tailscale] ${parts.join(" | ")}`;

  // Build HTML body
  let html = `<h2>Tailscale Network Status Change</h2><p>Detected at: ${timestamp}</p>`;

  if (wentOffline.length > 0) {
    html += `<h3 style="color: #dc3545;">Nodes Offline</h3>
      <table border="1" cellpadding="8" style="border-collapse: collapse;">
        <tr style="background: #f5f5f5;"><th>Hostname</th><th>IP</th><th>OS</th><th>Last Seen</th></tr>`;
    for (const node of wentOffline) {
      html += `<tr><td><strong>${node.hostname}</strong></td><td>${node.ip}</td><td>${node.os}</td><td>${node.lastSeen}</td></tr>`;
    }
    html += `</table>`;
  }

  if (cameOnline.length > 0) {
    html += `<h3 style="color: #28a745;">Nodes Recovered</h3>
      <table border="1" cellpadding="8" style="border-collapse: collapse;">
        <tr style="background: #f5f5f5;"><th>Hostname</th><th>IP</th><th>OS</th></tr>`;
    for (const node of cameOnline) {
      html += `<tr><td><strong>${node.hostname}</strong></td><td>${node.ip}</td><td>${node.os}</td></tr>`;
    }
    html += `</table>`;
  }

  // Send via Resend API
  const recipients = env.EMAIL_TO.split(",").map((e) => e.trim());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: recipients,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${text}`);
  }
}
