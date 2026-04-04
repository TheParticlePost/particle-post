/**
 * HTML email templates for Particle Post.
 *
 * Article notification layout is shared with pipeline/templates/article_notification.html
 * (used by the Python email sender). Keep visual changes in sync.
 *
 * Brand tokens:
 *   Vermillion: #E8552E
 *   Rich Black: #141414
 *   Warm White: #F5F0EB
 *   Drift:      #9A8C82
 *   DM Sans for body, IBM Plex Mono for metadata
 */

const SITE_URL = "https://theparticlepost.com";
const LOGO_URL = `${SITE_URL}/logo-email.png`;

function baseWrapper(content: string, unsubscribeUrl?: string): string {
  const unsubBlock = unsubscribeUrl
    ? `<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid rgba(90,65,59,0.2)">
         <a href="${unsubscribeUrl}" style="color:#9A8C82;font-size:11px;font-family:'IBM Plex Mono',monospace;text-decoration:none">Unsubscribe</a>
         <span style="color:#6B5E56;font-size:11px;font-family:'IBM Plex Mono',monospace"> · </span>
         <a href="${SITE_URL}" style="color:#9A8C82;font-size:11px;font-family:'IBM Plex Mono',monospace;text-decoration:none">theparticlepost.com</a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#141414;font-family:'DM Sans',Helvetica,Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#141414">
  <tr><td align="center" style="padding:32px 16px">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#1E1E1E;border-radius:6px">
      <!-- Header -->
      <tr><td style="padding:24px 32px;border-bottom:2px solid #E8552E">
        <a href="${SITE_URL}" style="text-decoration:none;color:#F5F0EB;font-size:18px;font-weight:700;font-family:'DM Sans',Helvetica,Arial,sans-serif">
          PARTICLE POST
        </a>
      </td></tr>
      <!-- Content -->
      ${content}
      <!-- Footer -->
      ${unsubBlock}
    </table>
  </td></tr>
</table>
</body></html>`;
}

/**
 * Welcome email sent on newsletter subscription.
 */
export function welcomeEmailTemplate(unsubscribeUrl: string): string {
  const content = `
    <tr><td style="padding:32px">
      <h1 style="color:#F5F0EB;font-size:24px;font-weight:700;margin:0 0 16px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
        Welcome to Particle Post
      </h1>
      <p style="color:#F5F0EB;font-size:16px;line-height:1.6;margin:0 0 16px">
        You are now subscribed to the AI briefing that business leaders read before markets open.
      </p>
      <p style="color:#9A8C82;font-size:14px;line-height:1.6;margin:0 0 24px">
        Here is what to expect:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:12px 16px;background-color:rgba(232,85,46,0.08);border-left:3px solid #E8552E;border-radius:0 4px 4px 0;margin-bottom:8px">
          <p style="color:#F5F0EB;font-size:14px;font-weight:600;margin:0">Morning Intelligence Wrap</p>
          <p style="color:#9A8C82;font-size:13px;margin:4px 0 0">AI strategy and implementation news, delivered by 9 AM ET.</p>
        </td></tr>
        <tr><td style="height:8px"></td></tr>
        <tr><td style="padding:12px 16px;background-color:rgba(232,85,46,0.08);border-left:3px solid #E8552E;border-radius:0 4px 4px 0;margin-bottom:8px">
          <p style="color:#F5F0EB;font-size:14px;font-weight:600;margin:0">Evening Market Closing</p>
          <p style="color:#9A8C82;font-size:13px;margin:4px 0 0">End-of-day analysis and deep dives, delivered by 5 PM ET.</p>
        </td></tr>
      </table>
      <p style="color:#9A8C82;font-size:13px;line-height:1.6;margin:24px 0 0">
        Read our latest articles at
        <a href="${SITE_URL}" style="color:#E8552E;text-decoration:none">theparticlepost.com</a>
      </p>
    </td></tr>`;

  return baseWrapper(content, unsubscribeUrl);
}

/**
 * Article notification email for subscribers.
 */
export function articleNotificationTemplate(
  title: string,
  description: string,
  slug: string,
  imageUrl: string | undefined,
  unsubscribeUrl: string,
): string {
  const articleUrl = `${SITE_URL}/posts/${slug}/`;
  const imageBlock = imageUrl
    ? `<tr><td style="padding:0 32px 16px">
         <img src="${imageUrl}" alt="${title}" width="536" style="width:100%;border-radius:4px;display:block" />
       </td></tr>`
    : "";

  const content = `
    <tr><td style="padding:24px 32px 8px">
      <p style="color:#E8552E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace">
        NEW BRIEFING
      </p>
    </td></tr>
    ${imageBlock}
    <tr><td style="padding:0 32px 16px">
      <a href="${articleUrl}" style="text-decoration:none">
        <h1 style="color:#F5F0EB;font-size:22px;font-weight:700;line-height:1.3;margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif">
          ${title}
        </h1>
      </a>
    </td></tr>
    <tr><td style="padding:0 32px 24px">
      <p style="color:#9A8C82;font-size:15px;line-height:1.6;margin:0">
        ${description}
      </p>
    </td></tr>
    <tr><td style="padding:0 32px 32px">
      <a href="${articleUrl}" style="display:inline-block;padding:12px 24px;background-color:#E8552E;color:#141414;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
        Read the full briefing &rarr;
      </a>
    </td></tr>`;

  return baseWrapper(content, unsubscribeUrl);
}

export function leadNotificationTemplate(
  specialistName: string,
  lead: { client_name: string; client_company: string | null; project_description: string; budget_range: string | null; }
): string {
  const safeDesc = lead.project_description.substring(0, 300);
  const company = lead.client_company ? ` at ${lead.client_company}` : "";
  const content = `
    <tr><td style="padding:24px 32px 8px"><p style="color:#E8552E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace">NEW INQUIRY</p></td></tr>
    <tr><td style="padding:0 32px 16px"><h1 style="color:#F5F0EB;font-size:22px;font-weight:700;line-height:1.3;margin:0">${specialistName}, you have a new lead</h1></td></tr>
    <tr><td style="padding:0 32px 24px"><p style="color:#9A8C82;font-size:15px;line-height:1.6;margin:0"><strong style="color:#F5F0EB">${lead.client_name}</strong>${company} is interested in working with you.</p></td></tr>
    <tr><td style="padding:0 32px 24px"><div style="background-color:#141414;border-radius:6px;padding:16px"><p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6E6660">Project Description</p><p style="margin:0;font-size:14px;color:#9A8C82;line-height:1.6">${safeDesc}${lead.project_description.length > 300 ? "..." : ""}</p>${lead.budget_range ? `<p style="margin:12px 0 0;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#6E6660">Budget: ${lead.budget_range}</p>` : ""}</div></td></tr>
    <tr><td style="padding:0 32px 32px"><a href="${SITE_URL}/dashboard/leads/" style="display:inline-block;padding:12px 24px;background-color:#E8552E;color:#141414;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px">VIEW IN DASHBOARD</a></td></tr>`;
  return baseWrapper(content);
}

export function matchNotificationTemplate(
  specialistName: string,
  brief: { client_name: string; client_company: string | null; project_description: string; categories: string[]; },
  rank: number,
  score: number
): string {
  const company = brief.client_company ? ` at ${brief.client_company}` : "";
  const pct = Math.round(score * 100);
  const safeDesc = brief.project_description.substring(0, 300);
  const content = `
    <tr><td style="padding:24px 32px 8px"><p style="color:#E8552E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace">PROJECT MATCH</p></td></tr>
    <tr><td style="padding:0 32px 16px"><h1 style="color:#F5F0EB;font-size:22px;font-weight:700;line-height:1.3;margin:0">You matched with a new project</h1></td></tr>
    <tr><td style="padding:0 32px 24px"><p style="color:#9A8C82;font-size:15px;line-height:1.6;margin:0">${specialistName}, a client${company} is looking for expertise in your area. You ranked <strong style="color:#F5F0EB">#${rank}</strong> with a <strong style="color:#F5F0EB">${pct}%</strong> match.</p></td></tr>
    <tr><td style="padding:0 32px 24px"><div style="background-color:#141414;border-radius:6px;padding:16px"><p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6E6660">Project Brief</p><p style="margin:0 0 12px;font-size:14px;color:#9A8C82;line-height:1.6">${safeDesc}${brief.project_description.length > 300 ? "..." : ""}</p><p style="margin:0;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#6E6660">Categories: ${brief.categories.join(", ")}</p></div></td></tr>
    <tr><td style="padding:0 32px 32px"><a href="${SITE_URL}/dashboard/" style="display:inline-block;padding:12px 24px;background-color:#E8552E;color:#141414;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px">VIEW DASHBOARD</a></td></tr>`;
  return baseWrapper(content);
}
