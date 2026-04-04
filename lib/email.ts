import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email via the Resend API.
 * Non-fatal: returns result object instead of throwing.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const {
    to,
    subject,
    html,
    from = "Particle Post <briefing@theparticlepost.com>",
    replyTo,
    headers,
  } = options;

  try {
    const body: Record<string, unknown> = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };

    if (replyTo) body.reply_to = replyTo;
    if (headers) body.headers = headers;

    const resp = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { success: false, error: `Resend API ${resp.status}: ${text}` };
    }

    const data = await resp.json();
    return { success: true, id: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
