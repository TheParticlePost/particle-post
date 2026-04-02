/**
 * Branded HTML email signature for Particle Post outreach emails.
 *
 * Usage:
 *   import { getEmailSignature } from "@/lib/email-signature";
 *   const sig = getEmailSignature({ name: "William", title: "Founder" });
 */

interface SignatureOptions {
  name: string;
  title?: string;
  linkedinUrl?: string;
}

const SITE_URL = "https://theparticlepost.com";
const SUBSCRIBE_URL = `${SITE_URL}/subscribe/`;
const LOGO_URL = `${SITE_URL}/logo-email.png`;

export function getEmailSignature(options: SignatureOptions): string {
  const { name, title = "Founder", linkedinUrl } = options;

  const linkedinRow = linkedinUrl
    ? `<tr><td style="padding:2px 0"><a href="${linkedinUrl}" style="color:#E8552E;text-decoration:none;font-size:12px;font-family:'IBM Plex Mono',monospace">LinkedIn</a></td></tr>`
    : "";

  return `
<table cellpadding="0" cellspacing="0" border="0" style="max-width:400px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
  <tr>
    <td style="padding:16px 0 12px 0;border-top:2px solid #E8552E">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:top;padding-right:16px">
            <img src="${LOGO_URL}" alt="Particle Post" width="40" height="40" style="border-radius:4px" />
          </td>
          <td style="vertical-align:top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td style="font-size:14px;font-weight:600;color:#F5F0EB;padding-bottom:2px">${name}</td></tr>
              <tr><td style="font-size:12px;color:#9A8C82;font-family:'IBM Plex Mono',monospace">${title} · Particle Post</td></tr>
              ${linkedinRow}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0">
      <a href="${SUBSCRIBE_URL}" style="display:inline-block;padding:8px 16px;background-color:#E8552E;color:#141414;font-size:12px;font-weight:600;text-decoration:none;border-radius:4px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
        Subscribe — Free AI Briefings
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:4px 0;font-size:11px;color:#6B5E56;font-family:'IBM Plex Mono',monospace">
      <a href="${SITE_URL}" style="color:#9A8C82;text-decoration:none">theparticlepost.com</a>
      &nbsp;·&nbsp;AI intelligence for business leaders
    </td>
  </tr>
</table>`.trim();
}
