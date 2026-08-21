import { env } from '../../config/env';
import type { DeliveryResult } from './email';

/**
 * WhatsApp delivery through Visity (https://wa.visity.io).
 *
 * The endpoint, auth header and payload field names are all configurable
 * because gateway vendors differ and change: point WHATSAPP_API_URL at the
 * send endpoint from your Visity dashboard and the rest follows.
 */

export function isWhatsAppConfigured(): boolean {
  return Boolean(env.whatsapp.apiUrl && env.whatsapp.apiKey);
}

/** Digits only, no +, no spaces — what every gateway expects. */
export function normalisePhone(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

/** HTML email bodies do not belong in a WhatsApp message. */
export function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|li|tr)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, 4000);
}

export async function sendWhatsApp(params: {
  to: string;
  message: string;
}): Promise<DeliveryResult> {
  const at = new Date().toISOString();
  const target = normalisePhone(params.to);

  if (!isWhatsAppConfigured()) {
    return {
      channel: 'whatsapp',
      target,
      status: 'SKIPPED',
      detail: 'WhatsApp not configured',
      at,
    };
  }
  if (!target) {
    return { channel: 'whatsapp', target: params.to, status: 'SKIPPED', detail: 'No phone number on record', at };
  }

  const body: Record<string, unknown> = {
    [env.whatsapp.toField]: target,
    [env.whatsapp.messageField]: params.message,
  };
  if (env.whatsapp.messageType) body.type = env.whatsapp.messageType;
  if (env.whatsapp.sender) body[env.whatsapp.senderField] = env.whatsapp.sender;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(env.whatsapp.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [env.whatsapp.authHeader]: env.whatsapp.authScheme
          ? `${env.whatsapp.authScheme} ${env.whatsapp.apiKey}`
          : env.whatsapp.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    if (!res.ok) {
      const detail = text.includes('number_not_found')
        ? `HTTP ${res.status}: that number has never messaged the business account. WhatsApp only permits a free-form reply inside the 24-hour window a contact opens, or an approved template. ${text.slice(0, 200)}`
        : `HTTP ${res.status}: ${text.slice(0, 300)}`;
      return { channel: 'whatsapp', target, status: 'FAILED', detail, at };
    }
    return { channel: 'whatsapp', target, status: 'SENT', detail: text.slice(0, 300), at };
  } catch (e) {
    const err = e as Error;
    return {
      channel: 'whatsapp',
      target,
      status: 'FAILED',
      detail: err.name === 'AbortError' ? 'Gateway timed out after 15s' : err.message,
      at,
    };
  }
}

export interface WhatsAppContact {
  id: string;
  waPhoneNumber: string;
  name?: string;
}

/**
 * Contacts that have messaged the business account. WhatsApp only permits a
 * free-form message to these, and only within 24 hours of their last inbound
 * message, so this is the set of numbers an alert can currently reach.
 */
export async function fetchContacts(): Promise<{ ok: boolean; contacts: WhatsAppContact[]; detail: string }> {
  if (!isWhatsAppConfigured()) {
    return { ok: false, contacts: [], detail: 'WHATSAPP_API_URL and WHATSAPP_API_KEY not set' };
  }

  // The send endpoint sits alongside the rest of the v1 API.
  const contactsUrl = env.whatsapp.apiUrl.replace(/\/messages\/send\/?$/, '/contacts');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(contactsUrl, {
      headers: {
        [env.whatsapp.authHeader]: env.whatsapp.authScheme
          ? `${env.whatsapp.authScheme} ${env.whatsapp.apiKey}`
          : env.whatsapp.apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return { ok: false, contacts: [], detail: `HTTP ${res.status} from ${contactsUrl}` };

    const json = (await res.json()) as { data?: { contacts?: WhatsAppContact[] } };
    const contacts = json?.data?.contacts ?? [];
    return { ok: true, contacts, detail: `${contacts.length} contacts have opted in` };
  } catch (e) {
    return { ok: false, contacts: [], detail: (e as Error).message };
  }
}

export function isReachable(phone: string | null | undefined, contacts: WhatsAppContact[]): boolean {
  if (!phone) return false;
  const target = normalisePhone(phone);
  return contacts.some((c) => normalisePhone(String(c.waPhoneNumber)) === target);
}
