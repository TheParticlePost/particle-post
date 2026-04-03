import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "unconfigured";
  latency?: number;
  detail?: string;
}

async function checkService(
  name: string,
  fn: () => Promise<string | undefined>
): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const detail = await fn();
    return {
      name,
      status: "connected",
      latency: Date.now() - start,
      detail,
    };
  } catch (err) {
    return {
      name,
      status: "error",
      latency: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = await Promise.all([
    // Supabase
    checkService("Supabase", async () => {
      const sb = getServiceClient();
      const { count } = await sb
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return `${count ?? 0} profiles`;
    }),

    // GitHub
    checkService("GitHub", async () => {
      const token = process.env.GH_PAT;
      if (!token) throw new Error("GH_PAT not configured");
      const res = await fetch(
        "https://api.github.com/repos/TheParticlePost/particle-post",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return `${data.full_name}`;
    }),

    // DataForSEO
    checkService("DataForSEO", async () => {
      const login = process.env.DATAFORSEO_LOGIN;
      const password = process.env.DATAFORSEO_PASSWORD;
      if (!login || !password) {
        return "unconfigured";
      }
      const encoded = Buffer.from(`${login}:${password}`).toString("base64");
      const res = await fetch(
        "https://api.dataforseo.com/v3/appendix/user_data",
        {
          headers: { Authorization: `Basic ${encoded}` },
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const balance = data.tasks?.[0]?.result?.[0]?.money?.balance;
      return balance !== undefined ? `$${balance.toFixed(2)} balance` : "OK";
    }),

    // Resend
    checkService("Resend", async () => {
      const key = process.env.RESEND_API_KEY;
      if (!key) throw new Error("RESEND_API_KEY not configured");
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return "OK";
    }),

    // Tavily
    checkService("Tavily", async () => {
      const key = process.env.TAVILY_API_KEY;
      if (!key) throw new Error("TAVILY_API_KEY not configured");
      // Lightweight check — just verify the key works
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query: "test",
          max_results: 1,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return "OK";
    }),
  ]);

  // Mark unconfigured services
  const services = checks.map((s) => {
    if (s.detail === "unconfigured") {
      return { ...s, status: "unconfigured" as const, detail: "Not configured" };
    }
    return s;
  });

  return NextResponse.json({ services });
}
