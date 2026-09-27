const RESEND_API_URL = 'https://api.resend.com/emails';

const FLEETEASE_EMAIL_DOMAIN = 'fleetease.com.mx';
const DEFAULT_FROM_EMAIL = `FleetEase <soporte@${FLEETEASE_EMAIL_DOMAIN}>`;

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * FleetEase solo envía correos transaccionales desde el dominio oficial.
 * También corrige configuraciones antiguas que todavía usen @fleetease.mx.
 */
function getFleetEaseFromEmail(from?: string): string {
  const configured = from || process.env.RESEND_FROM_EMAIL;

  if (!configured) return DEFAULT_FROM_EMAIL;

  if (/@fleetease\.mx\b/i.test(configured)) {
    return configured.replace(/@fleetease\.mx\b/gi, `@${FLEETEASE_EMAIL_DOMAIN}`);
  }

  if (!/@fleetease\.com\.mx\b/i.test(configured)) {
    return DEFAULT_FROM_EMAIL;
  }

  return configured;
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY no está configurada.');

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFleetEaseFromEmail(from),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend respondió ${response.status}`);
  }

  return data as { id?: string };
}
