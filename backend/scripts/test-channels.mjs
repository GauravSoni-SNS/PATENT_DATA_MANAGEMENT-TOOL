/**
 * Checks the email and WhatsApp configuration without running the API.
 *
 * Reads the same variables the server does (shell first, then backend/.env),
 * reports what is missing, verifies SMTP, and optionally sends one real message
 * on each channel. On a WhatsApp failure it prints the exact request it made,
 * so the payload can be lined up against the gateway's documentation without a
 * redeploy.
 *
 * Usage (from backend/):
 *   node scripts/test-channels.mjs
 *   node scripts/test-channels.mjs --email you@firm.com --phone +919000000104
 */
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendDir, '.env') });

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const targetEmail = arg('--email');
const targetPhone = arg('--phone');

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
};

const wa = {
  apiUrl: process.env.WHATSAPP_API_URL || '',
  apiKey: process.env.WHATSAPP_API_KEY || '',
  sender: process.env.WHATSAPP_SENDER || '',
  authHeader: process.env.WHATSAPP_AUTH_HEADER || 'Authorization',
  authScheme: process.env.WHATSAPP_AUTH_SCHEME ?? 'Bearer',
  toField: process.env.WHATSAPP_TO_FIELD || 'to',
  messageField: process.env.WHATSAPP_MESSAGE_FIELD || 'message',
  senderField: process.env.WHATSAPP_SENDER_FIELD || 'from',
};

const mask = (v) => (v ? v.slice(0, 2) + '***' + v.slice(-2) + ' (' + v.length + ' chars)' : 'NOT SET');
const show = (v) => (v ? v : 'NOT SET');

console.log('\n--- EMAIL (SMTP) ---');
console.log('  SMTP_HOST :', show(smtp.host));
console.log('  SMTP_PORT :', smtp.port, smtp.port === 465 ? '(implicit TLS)' : '(STARTTLS)');
console.log('  SMTP_USER :', show(smtp.user));
console.log('  SMTP_PASS :', mask(smtp.pass));
console.log('  SMTP_FROM :', show(smtp.from));

console.log('\n--- WHATSAPP ---');
console.log('  WHATSAPP_API_URL :', show(wa.apiUrl));
console.log('  WHATSAPP_API_KEY :', mask(wa.apiKey));
console.log('  WHATSAPP_SENDER  :', show(wa.sender));
console.log('  auth header      :', wa.authHeader + ': ' + (wa.authScheme ? wa.authScheme + ' ' : '') + '<key>');
console.log('  body fields      :', JSON.stringify({ [wa.toField]: '<number>', [wa.messageField]: '<text>' }));

async function checkEmail() {
  console.log('\n--- EMAIL CHECK ---');
  if (!smtp.host || !smtp.user || !smtp.pass || !smtp.from) {
    console.log('  SKIPPED: set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM first.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  try {
    await transporter.verify();
    console.log('  connection: OK (' + smtp.host + ':' + smtp.port + ')');
  } catch (e) {
    console.log('  connection: FAILED - ' + e.message);
    if (/invalid login|username and password/i.test(e.message)) {
      console.log('  hint: Gmail and Outlook reject account passwords. Create an app password.');
    }
    if (/self signed|certificate/i.test(e.message)) {
      console.log('  hint: wrong port. 587 uses STARTTLS, 465 uses implicit TLS.');
    }
    return;
  }

  if (!targetEmail) {
    console.log('  no --email given, nothing sent.');
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: smtp.from,
      to: targetEmail,
      subject: 'LexPatent Docket Radar - channel test',
      html: '<p>If you are reading this, the email channel works.</p>',
    });
    console.log('  send to ' + targetEmail + ': SENT (' + info.messageId + ')');
  } catch (e) {
    console.log('  send to ' + targetEmail + ': FAILED - ' + e.message);
  }
}

async function checkWhatsApp() {
  console.log('\n--- WHATSAPP CHECK ---');
  if (!wa.apiUrl || !wa.apiKey) {
    console.log('  SKIPPED: set WHATSAPP_API_URL and WHATSAPP_API_KEY first.');
    return;
  }
  if (!targetPhone) {
    console.log('  configured, but no --phone given, nothing sent.');
    return;
  }

  const to = targetPhone.replace(/[^\d]/g, '');
  const body = { [wa.toField]: to, [wa.messageField]: 'LexPatent Docket Radar - channel test' };
  if (wa.sender) body[wa.senderField] = wa.sender;

  const headers = {
    'Content-Type': 'application/json',
    [wa.authHeader]: wa.authScheme ? wa.authScheme + ' ' + wa.apiKey : wa.apiKey,
  };

  console.log('  POST ' + wa.apiUrl);
  console.log('  body ' + JSON.stringify(body));

  try {
    const res = await fetch(wa.apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await res.text();
    console.log('  status: HTTP ' + res.status);
    console.log('  response: ' + text.slice(0, 500));
    if (!res.ok) {
      console.log('\n  The gateway rejected it. Compare the body above with your');
      console.log('  provider docs and adjust WHATSAPP_TO_FIELD / WHATSAPP_MESSAGE_FIELD /');
      console.log('  WHATSAPP_AUTH_HEADER / WHATSAPP_AUTH_SCHEME - no code change needed.');
    }
  } catch (e) {
    console.log('  request failed: ' + e.message);
  }
}

await checkEmail();
await checkWhatsApp();
console.log('');
