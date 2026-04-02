import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, getServiceClient } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetId, subject, bodyHtml } = await req.json();
  if (!targetId || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "targetId, subject, bodyHtml required" },
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

  const sb = getServiceClient();

  // Get target info
  const { data: target } = await sb
    .from("outreach_targets")
    .select("*")
    .eq("id", targetId)
    .single();

  if (!target || !target.contact_email) {
    return NextResponse.json(
      { error: "Target not found or no contact email" },
      { status: 400 }
    );
  }

  // Send via Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "William at Particle Post <outreach@theparticlepost.com>",
        to: target.contact_email,
        subject,
        html: bodyHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Resend error: ${err}` },
        { status: 502 }
      );
    }

    const resendData = await res.json();

    // Get current sequence step
    const { count } = await sb
      .from("outreach_emails")
      .select("*", { count: "exact", head: true })
      .eq("target_id", targetId);

    const step = (count || 0) + 1;

    // Record the email
    await sb.from("outreach_emails").insert({
      target_id: targetId,
      sequence_step: step,
      subject,
      body_html: bodyHtml,
      sent_at: new Date().toISOString(),
      resend_id: resendData.id || null,
    });

    // Update target status
    await sb
      .from("outreach_targets")
      .update({ status: step === 1 ? "emailed" : "followed_up" })
      .eq("id", targetId);

    return NextResponse.json({ success: true, resendId: resendData.id });
  } catch (err) {
    return NextResponse.json(
      { error: `Send failed: ${err}` },
      { status: 500 }
    );
  }
}
