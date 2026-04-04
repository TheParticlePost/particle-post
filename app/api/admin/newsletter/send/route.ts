import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await req.json();
  if (!slug) {
    return NextResponse.json(
      { error: "Article slug required" },
      { status: 400 }
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Find the article file
  const postsDir = path.join(process.cwd(), "blog/content/posts");
  let articleFile: string | null = null;

  try {
    const files = await fs.readdir(postsDir);
    articleFile = files.find((f) => f.includes(slug)) || null;
  } catch {
    return NextResponse.json(
      { error: "Posts directory not found" },
      { status: 500 }
    );
  }

  if (!articleFile) {
    return NextResponse.json(
      { error: `Article '${slug}' not found` },
      { status: 404 }
    );
  }

  const content = await fs.readFile(
    path.join(postsDir, articleFile),
    "utf-8"
  );

  // Extract frontmatter
  const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
  const descMatch = content.match(/^description:\s*"?([^"\n]+)"?/m);
  const title = titleMatch?.[1] || slug;
  const description = descMatch?.[1] || "";
  const articleUrl = `https://theparticlepost.com/posts/${slug}/`;

  // Get active subscribers
  const sb = getServiceClient();
  const { data: subscribers } = await sb
    .from("subscribers")
    .select("email")
    .eq("status", "active");

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No active subscribers" });
  }

  let sent = 0;
  let failed = 0;

  // Batch send via Resend (50 per batch)
  const batchSize = 50;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          batch.map((sub) => ({
            from: "Particle Post <briefing@theparticlepost.com>",
            to: sub.email,
            subject: title,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#141414;font-family:'DM Sans',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#141414;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1E1E1E;border-radius:6px">
<tr><td style="padding:24px 32px;border-bottom:2px solid #E8552E">
<span style="color:#F5F0EB;font-size:18px;font-weight:700">PARTICLE POST</span>
</td></tr>
<tr><td style="padding:24px 32px 8px">
<p style="color:#E8552E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace">NEW BRIEFING</p>
</td></tr>
<tr><td style="padding:0 32px 16px">
<h1 style="color:#F5F0EB;font-size:22px;font-weight:700;line-height:1.3;margin:0">${title}</h1>
</td></tr>
<tr><td style="padding:0 32px 24px">
<p style="color:#9A8C82;font-size:15px;line-height:1.6;margin:0">${description}</p>
</td></tr>
<tr><td style="padding:0 32px 32px">
<a href="${articleUrl}?utm_source=newsletter&utm_medium=email" style="display:inline-block;padding:12px 24px;background:#E8552E;color:#F5F0EB;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px">Read the full briefing &rarr;</a>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid rgba(90,65,59,0.2);text-align:center">
<p style="color:#6B5E56;font-size:11px;margin:0;font-family:'IBM Plex Mono',monospace">theparticlepost.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`,
          }))
        ),
      });

      if (res.ok) {
        sent += batch.length;
      } else {
        failed += batch.length;
      }
    } catch {
      failed += batch.length;
    }
  }

  return NextResponse.json({ sent, failed, total: subscribers.length });
}
