import nodemailer from 'nodemailer';
import { db } from '../../../database/db.database.mjs';
import { NotificationModel } from '../../modules/notifications-VII/notification.model.mjs';
import { SETTINGS } from '../../../config/settings.config.mjs';

function getTransporter() {
  if (!SETTINGS.MAIL_HOST || !SETTINGS.MAIL_USER || !SETTINGS.MAIL_PASSWORD) {
    console.warn('SMTP env missing — email notifications disabled');
    return null;
  }
  return nodemailer.createTransport({
    host: SETTINGS.MAIL_HOST,
    port: SETTINGS.MAIL_PORT,
    secure: false,
    auth: { user: SETTINGS.MAIL_USER, pass: SETTINGS.MAIL_PASSWORD }
  });
}

async function getUserById(userId) {
  const [rows] = await db.query(
    'SELECT user_id, email, CONCAT(first_name, " ", last_name) AS name FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0] || null;
}

async function sendEmail(to, subject, html) {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'no-transporter' };
  await transporter.sendMail({ from: SETTINGS.MAIL_FROM, to, subject, html });
  return { sent: true };
}

// Email templates
function baseTemplate({ title, intro, detailsHtml, actionLabel = 'Ir a Sigra', actionUrl = SETTINGS.APP_URL, footer = 'Este es un mensaje automático.' }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${escapeHtml(title)}</title>
      <style>
        body { margin:0; padding:0; background:#f6f9fc; font-family: Arial, sans-serif; color:#1f2937; }
        .container { max-width:640px; margin:24px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08); }
        .header { background:#1f2937; color:#ffffff; padding:20px 24px; }
        .brand { font-weight:700; font-size:18px; letter-spacing:0.4px; }
        .content { padding:24px; }
        h1 { font-size:20px; margin:0 0 12px; }
        p { margin:0 0 12px; line-height:1.6; }
        .details { background:#f3f4f6; padding:16px; border-radius:8px; font-size:14px; }
        .cta { margin-top:16px; }
        .btn { display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:10px 16px; border-radius:8px; font-weight:600; }
        .footer { font-size:12px; color:#6b7280; padding:16px 24px; border-top:1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="brand">SIGRA Academy</div>
        </div>
        <div class="content">
          <h1>${escapeHtml(title)}</h1>
          <p>${intro}</p>
          ${detailsHtml ? `<div class="details">${detailsHtml}</div>` : ''}
          <div class="cta">
            <a class="btn" href="${actionUrl}" target="_blank" rel="noopener">${escapeHtml(actionLabel)}</a>
          </div>
        </div>
        <div class="footer">${footer}</div>
      </div>
    </body>
  </html>`;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderTemplate(template, data) {
  const { title, message, name, meta = {} } = data;
  const intro = `Hola ${escapeHtml(name || 'usuario')}, ${escapeHtml(message || '')}`;
  const metaList = Object.entries(meta)
    .map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`)
    .join('');
  const detailsHtml = metaList || '';

  switch (template) {
    case 'activity':
      return baseTemplate({ title, intro, detailsHtml, actionLabel: 'Ver actividad', actionUrl: SETTINGS.APP_URL });
    case 'warning':
      return baseTemplate({ title, intro: `${intro}<br/>Atención: se detectó un evento importante.`, detailsHtml, actionLabel: 'Revisar ahora', actionUrl: SETTINGS.APP_URL });
    case 'notification':
      return baseTemplate({ title, intro, detailsHtml, actionLabel: 'Ver notificación', actionUrl: SETTINGS.APP_URL });
    case 'generic':
    default:
      return baseTemplate({ title, intro, detailsHtml });
  }
}

export async function sendEmailNotification({
  userId,
  title,
  message,
  type = 'activity',
  template = 'generic',
  meta = {}
}) {
  const result = await NotificationModel.createNotification({ user_id: userId, title, message, type });
  console.log('Notification created:', result);
  const user = await getUserById(userId);
  if (!user || !user.email) return { ok: true, email: false };
  const html = renderTemplate(template, { title, message, name: user.name, meta });
  const subject = `SIGRA Academy — ${title}`;
  await sendEmail(user.email, subject, html);
  return { ok: true, email: true };
}

export function activityNotifierMiddleware(req, res, next) {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

  res.on('finish', async () => {
    if (!isMutation) return;
    if (res.locals.notify === false) return;

    try {
      const override = res.locals.notify || {};
      const userId = override.userId || req.user?.userId;
      if (!userId) return;

      const title =
        override.title ||
        `Actividad en ${req.baseUrl || ''}${req.path}`.replace(/\/+/g, '/');
      const message =
        override.message ||
        `Se realizó ${req.method} en ${req.originalUrl}. Estado: ${res.statusCode}`;
      const type = override.type || 'activity';
      const template = override.template || 'activity';
      const meta =
        override.meta ||
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          at: new Date().toISOString()
        };

      await sendEmailNotification({ userId, title, message, type, template, meta });
    } catch (err) {
      console.error('Notifier error:', err);
    }
  });

  next();
}