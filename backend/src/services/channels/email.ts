import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';

export interface DeliveryResult {
  channel: 'email' | 'whatsapp';
  target: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  detail?: string;
  at: string;
}

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS, which nodemailer does
    // automatically when secure is false.
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

/** Proves the SMTP credentials work without sending anything. */
export async function verifyEmailTransport(): Promise<{ ok: boolean; detail: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, detail: 'SMTP is not configured (needs SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)' };
  }
  try {
    await getTransporter().verify();
    return { ok: true, detail: `Connected to ${env.smtp.host}:${env.smtp.port}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<DeliveryResult> {
  const at = new Date().toISOString();

  if (!isEmailConfigured()) {
    return {
      channel: 'email',
      target: params.to,
      status: 'SKIPPED',
      detail: 'SMTP not configured',
      at,
    };
  }

  try {
    const info = await getTransporter().sendMail({
      from: env.smtp.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return {
      channel: 'email',
      target: params.to,
      status: 'SENT',
      detail: info.messageId,
      at,
    };
  } catch (e) {
    return {
      channel: 'email',
      target: params.to,
      status: 'FAILED',
      detail: (e as Error).message,
      at,
    };
  }
}
