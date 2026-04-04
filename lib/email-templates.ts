const VERMILLION = "#E8552E";
const BG_BASE = "#141414";
const BG_CONTAINER = "#1E1E1E";
const TEXT_PRIMARY = "#F5F0EB";
const TEXT_SECONDARY = "#A89E94";
const TEXT_MUTED = "#6E6660";
const BORDER = "rgba(90,65,59,0.30)";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

function wrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG_BASE};font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_BASE};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:0 0 24px;">
          <span style="font-family:'Sora',Helvetica,sans-serif;font-size:18px;font-weight:700;color:${TEXT_PRIMARY};letter-spacing:-0.02em;">
            PARTICLE POST
          </span>
        </td></tr>
        <!-- Content -->
        <tr><td style="background:${BG_CONTAINER};border:1px solid ${BORDER};border-radius:6px;padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:${TEXT_MUTED};font-family:'IBM Plex Mono',monospace;">
            The Particle Post &middot; AI Specialist Directory
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function leadNotificationTemplate(
  specialistName: string,
  lead: {
    client_name: string;
    client_company: string | null;
    project_description: string;
    budget_range: string | null;
  }
): string {
  const safeName = escapeHtml(specialistName);
  const safeClientName = escapeHtml(lead.client_name);
  const safeDescription = escapeHtml(lead.project_description.substring(0, 300));
  const companyLine = lead.client_company
    ? `<span style="color:${TEXT_SECONDARY};font-size:14px;"> at ${escapeHtml(lead.client_company)}</span>`
    : "";

  return wrapper(`
    <p style="margin:0 0 4px;font-family:'Sora',Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${VERMILLION};">
      NEW INQUIRY
    </p>
    <h1 style="margin:0 0 16px;font-family:'Sora',Helvetica,sans-serif;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">
      ${safeName}, you have a new lead
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.6;">
      <strong style="color:${TEXT_PRIMARY};">${safeClientName}</strong>${companyLine} is interested in working with you.
    </p>
    <div style="background:${BG_BASE};border-radius:6px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${TEXT_MUTED};">
        Project Description
      </p>
      <p style="margin:0;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;">
        ${safeDescription}${lead.project_description.length > 300 ? "..." : ""}
      </p>
      ${lead.budget_range ? `<p style="margin:12px 0 0;font-family:'IBM Plex Mono',monospace;font-size:13px;color:${TEXT_MUTED};">Budget: ${escapeHtml(lead.budget_range)}</p>` : ""}
    </div>
    <a href="https://theparticlepost.com/dashboard/leads/"
       style="display:inline-block;background:${VERMILLION};color:${TEXT_PRIMARY};font-family:'DM Sans',Helvetica,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:12px 24px;border-radius:6px;text-decoration:none;">
      VIEW IN DASHBOARD
    </a>
  `);
}

export function matchNotificationTemplate(
  specialistName: string,
  brief: {
    client_name: string;
    client_company: string | null;
    project_description: string;
    categories: string[];
  },
  rank: number,
  score: number
): string {
  const safeName = escapeHtml(specialistName);
  const companyLine = brief.client_company
    ? ` at ${escapeHtml(brief.client_company)}`
    : "";
  const scorePercent = Math.round(score * 100);
  const safeDescription = escapeHtml(brief.project_description.substring(0, 300));
  const safeCategories = brief.categories.map(escapeHtml).join(", ");

  return wrapper(`
    <p style="margin:0 0 4px;font-family:'Sora',Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:${VERMILLION};">
      PROJECT MATCH
    </p>
    <h1 style="margin:0 0 16px;font-family:'Sora',Helvetica,sans-serif;font-size:22px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">
      You matched with a new project
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${TEXT_SECONDARY};line-height:1.6;">
      ${safeName}, a client${companyLine} is looking for expertise in your area. You ranked <strong style="color:${TEXT_PRIMARY};">#${rank}</strong> with a <strong style="color:${TEXT_PRIMARY};">${scorePercent}%</strong> match.
    </p>
    <div style="background:${BG_BASE};border-radius:6px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${TEXT_MUTED};">
        Project Brief
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:${TEXT_SECONDARY};line-height:1.6;">
        ${safeDescription}${brief.project_description.length > 300 ? "..." : ""}
      </p>
      <p style="margin:0;font-family:'IBM Plex Mono',monospace;font-size:13px;color:${TEXT_MUTED};">
        Categories: ${safeCategories}
      </p>
    </div>
    <a href="https://theparticlepost.com/dashboard/"
       style="display:inline-block;background:${VERMILLION};color:${TEXT_PRIMARY};font-family:'DM Sans',Helvetica,sans-serif;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding:12px 24px;border-radius:6px;text-decoration:none;">
      VIEW DASHBOARD
    </a>
  `);
}
