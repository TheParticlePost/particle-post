import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";
import { getEmailSignature } from "@/lib/email-signature";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetId } = await req.json();
  if (!targetId) {
    return NextResponse.json(
      { error: "targetId required" },
      { status: 400 }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const sb = getServiceClient();
  const { data: target } = await sb
    .from("outreach_targets")
    .select("*")
    .eq("id", targetId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const prompt = `Write a short, professional outreach email for backlink replacement. Context:

- Site we're contacting: ${target.site_name || target.site_url}
- Their broken link: ${target.broken_link_url || "unknown"}
- Our replacement article: ${target.our_replacement_url || "https://theparticlepost.com"}
- Contact name: ${target.contact_name || "there"}

Requirements:
- Subject line on first line, then blank line, then email body
- Maximum 5 sentences in the body
- Professional but warm tone
- Mention the specific broken link if available
- Suggest our article as a replacement
- Don't be pushy
- Sign off with just "Best," (no name — signature is added separately)

Output format:
Subject: [subject line]

[email body]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Anthropic error: ${err}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.text || "Failed to generate email content.";

    // Parse subject and body
    const subjectMatch = text.match(/^Subject:\s*(.+)/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : "Partnership opportunity";
    const body = text
      .replace(/^Subject:.*\n\n?/m, "")
      .trim();

    // Wrap body in simple HTML with signature
    const signature = getEmailSignature({
      name: "William",
      title: "Founder",
    });

    const bodyHtml = `
<div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#333;font-size:14px;line-height:1.6">
  ${body
    .split("\n\n")
    .map((p: string) => `<p>${p}</p>`)
    .join("")}
  <br/>
  ${signature}
</div>`.trim();

    return NextResponse.json({ subject, bodyHtml });
  } catch (err) {
    return NextResponse.json(
      { error: `Generation failed: ${err}` },
      { status: 500 }
    );
  }
}
