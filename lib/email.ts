import "server-only";
import { Resend } from "resend";
import {
  leadNotificationTemplate,
  matchNotificationTemplate,
} from "./email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Particle Post Leads <leads@theparticlepost.com>";

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Error:", err);
    return false;
  }
}

export async function sendLeadNotification(
  specialistEmail: string,
  specialistName: string,
  lead: {
    client_name: string;
    client_company: string | null;
    project_description: string;
    budget_range: string | null;
  }
): Promise<boolean> {
  const html = leadNotificationTemplate(specialistName, lead);
  return sendEmail(
    specialistEmail,
    `New inquiry from ${lead.client_name}`,
    html
  );
}

export async function sendMatchNotification(
  specialistEmail: string,
  specialistName: string,
  brief: {
    client_name: string;
    client_company: string | null;
    project_description: string;
    categories: string[];
  },
  rank: number,
  score: number
): Promise<boolean> {
  const html = matchNotificationTemplate(specialistName, brief, rank, score);
  return sendEmail(
    specialistEmail,
    `You matched with a new project`,
    html
  );
}
