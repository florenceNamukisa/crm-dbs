import nodemailer from 'nodemailer';

// NOTE: .env is loaded by server.js via dotenv.config() at startup.
// Do NOT load it again here to avoid path issues.
// Environment variables are already available via process.env.

console.log('[EmailService] Initializing...');

/**
 * Create a FRESH transporter every time - no caching to avoid stale connections
 */
const createTransporter = async () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = Number(process.env.EMAIL_PORT) || 587;
    const secure = process.env.EMAIL_SECURE === 'true';

    console.log('[EmailService] Creating Gmail transporter: ' + user + ' -> ' + host + ':' + port);

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure,
      auth: {
        user: user,
        pass: pass,
      },
      // Gmail specific: requires these settings
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true, // Enable debug output
      logger: true, // Enable logger
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs
      },
    });

    return transporter;
  }

  // Fallback to Ethereal
  console.log('[EmailService] No SMTP credentials - creating Ethereal test account');
  const testAccount = await nodemailer.createTestAccount();
  console.log('[EmailService] Ethereal account: ' + testAccount.user);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

// 6-digit numeric OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===========================================================================
// SHARED EMAIL DESIGN SYSTEM
// ===========================================================================

const BRAND = {
  name: 'Xtreative CRM',
  primary: '#F97316',
  primaryDark: '#EA580C',
  primarySoft: '#FFF7ED',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  danger: '#DC2626',
  success: '#16A34A',
  fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const year = () => new Date().getFullYear();

function escapeHtml(s) {
  s = s == null ? '' : String(s);
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
function hexToRgba(hex, alpha) {
  alpha = alpha == null ? 1 : alpha;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return 'rgba(249,115,22,' + alpha + ')';
  return 'rgba(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16) + ', ' + alpha + ')';
}

export function buildEmail(opts) {
  const accent = (opts && opts.accent) || BRAND.primary;
  const eyebrow = (opts && opts.eyebrow) || BRAND.name;
  const title = (opts && opts.title) || BRAND.name;
  const body = (opts && opts.body) || '';
  const cta = opts && opts.cta;
  const footerNote = opts && opts.footerNote;
  const preheader = (opts && opts.preheader) || '';

  const html =
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<meta name="color-scheme" content="light" />' +
    '<title>' + escapeHtml(title) + '</title>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:' + BRAND.bg + ';font-family:' + BRAND.fontStack + ';color:' + BRAND.text + ';-webkit-font-smoothing:antialiased;">' +
    (preheader
      ? '<div style="display:none;max-height:0;overflow:hidden;color:transparent;">' + escapeHtml(preheader) + '</div>'
      : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BRAND.bg + ';padding:32px 16px;">' +
      '<tr><td align="center">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:' + BRAND.card + ';border:1px solid ' + BRAND.border + ';border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);">' +
          '<tr><td style="background:linear-gradient(135deg,' + accent + ' 0%,' + BRAND.primaryDark + ' 100%);padding:36px 40px;">' +
            '<div style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;">' + escapeHtml(eyebrow) + '</div>' +
            '<h1 style="margin:14px 0 0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;">' + escapeHtml(title) + '</h1>' +
          '</td></tr>' +
          '<tr><td style="padding:36px 40px 8px;font-size:15px;line-height:1.6;color:' + BRAND.text + ';">' + body + '</td></tr>' +
          (cta
            ? '<tr><td align="center" style="padding:24px 40px 8px;">' +
                '<a href="' + escapeAttr(cta.url) + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:' + accent + ';color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 30px;border-radius:10px;box-shadow:0 6px 16px ' + hexToRgba(accent, 0.35) + ';">' + escapeHtml(cta.label) + '</a>' +
              '</td></tr>'
            : '') +
          (footerNote
            ? '<tr><td style="padding:8px 40px 0;font-size:13px;line-height:1.55;color:' + BRAND.muted + ';">' + footerNote + '</td></tr>'
            : '') +
          '<tr><td style="padding:32px 40px 0;"><div style="height:1px;background:' + BRAND.border + ';"></div></td></tr>' +
          '<tr><td style="padding:20px 40px 32px;font-size:12px;line-height:1.6;color:' + BRAND.muted + ';text-align:center;">' +
            '<div style="margin-bottom:6px;"><strong style="color:' + BRAND.text + ';">' + BRAND.name + '</strong></div>' +
            '<div>&copy; ' + year() + ' ' + BRAND.name + '. All rights reserved.</div>' +
            '<div style="margin-top:8px;">This is a transactional email related to your account. Please do not reply directly.</div>' +
          '</td></tr>' +
        '</table>' +
        '<div style="max-width:600px;margin:16px auto 0;font-size:11px;color:' + BRAND.muted + ';text-align:center;">You are receiving this because you have an account on ' + BRAND.name + '.</div>' +
      '</td></tr>' +
    '</table>' +
    '</body></html>';

  return { subject: title, html };
}

function credentialsBlock(opts) {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid ' + BRAND.border + ';border-radius:12px;overflow:hidden;background:#FAFBFC;">' +
      '<tr><td style="padding:14px 20px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:' + BRAND.muted + ';background:#F1F5F9;font-weight:600;">Your login credentials</td></tr>' +
      '<tr><td style="padding:18px 20px;font-size:14px;line-height:1.6;">' +
        '<div style="margin-bottom:10px;"><span style="color:' + BRAND.muted + ';">Email:&nbsp;</span><strong style="color:' + BRAND.text + ';">' + escapeHtml(opts.email) + '</strong></div>' +
        '<div><span style="color:' + BRAND.muted + ';">Temporary password:&nbsp;</span><strong style="color:' + BRAND.text + ';font-family:\'SF Mono\',\'Menlo\',\'Consolas\',monospace;">' + escapeHtml(opts.password) + '</strong></div>' +
      '</td></tr>' +
    '</table>'
  );
}

const emailTemplates = {
  agentWelcome: function (data) {
    const name = (data && data.name) || 'there';
    const email = (data && data.email) || '';
    const otp = (data && data.otp) || '';
    const loginUrl = (data && data.loginUrl) || 'http://localhost:5173/login';
    return buildEmail({
      accent: BRAND.primary,
      eyebrow: 'Welcome aboard',
      title: 'Welcome to ' + BRAND.name + ', ' + name + '!',
      preheader: 'Your account is ready. Sign in to get started.',
      body:
        '<p style="margin:0 0 16px;">Hi <strong>' + escapeHtml(name) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">Your account has been created. Use the credentials below to sign in to your CRM workspace right away.</p>' +
        credentialsBlock({ email: email, password: otp }) +
        '<p style="margin:16px 0 0;color:' + BRAND.muted + ';font-size:13px;">For security, you will be asked to change this temporary password on first login.</p>',
      cta: { label: 'Sign in to your dashboard', url: loginUrl },
    });
  },

  passwordReset: function (data) {
    const name = (data && data.name) || 'there';
    const otp = (data && data.otp) || '';
    return buildEmail({
      accent: BRAND.danger,
      eyebrow: 'Security alert',
      title: 'Reset your password',
      preheader: 'Use the one-time code below to reset your password.',
      body:
        '<p style="margin:0 0 16px;">Hi <strong>' + escapeHtml(name) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">We received a request to reset the password for your ' + BRAND.name + ' account.</p>' +
        '<div style="margin:24px 0 8px;text-align:center;">' +
          '<div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:' + BRAND.muted + ';">Password reset code</div>' +
          '<div style="display:inline-block;margin-top:10px;padding:18px 28px;font-family:monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:' + BRAND.primary + ';background:' + BRAND.primarySoft + ';border:2px dashed ' + BRAND.primary + ';border-radius:12px;">' + escapeHtml(otp) + '</div>' +
          '<div style="margin-top:10px;font-size:12px;color:' + BRAND.muted + ';">This code expires in <strong>15 minutes</strong>.</div>' +
        '</div>',
    });
  },

  taskReminder: function (data) {
    const agentName = (data && data.agentName) || 'there';
    const clientName = (data && data.clientName) || '';
    const taskTitle = (data && data.taskTitle) || '';
    const taskDescription = data && data.taskDescription;
    const dueDate = data && data.dueDate;
    const isOverdue = Boolean(data && data.isOverdue);
    const appUrl = data && data.appUrl;
    const formattedDate = dueDate
      ? new Date(dueDate).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    const accent = isOverdue ? BRAND.danger : BRAND.primary;

    return buildEmail({
      accent: accent,
      eyebrow: isOverdue ? 'Overdue' : 'Due soon',
      title: isOverdue ? 'Task overdue' : 'Task reminder',
      preheader: taskTitle + ' for ' + clientName,
      body:
        '<p style="margin:0 0 16px;">Hi <strong>' + escapeHtml(agentName) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">' + (isOverdue ? 'Task is overdue' : 'Task reminder') + ' for <strong>' + escapeHtml(clientName) + '</strong>.</p>' +
        '<div style="margin:16px 0;padding:18px 20px;border-left:4px solid ' + accent + ';border-radius:10px;background:#F8FAFC;">' +
          '<div style="font-weight:600;font-size:15px;">' + escapeHtml(taskTitle) + '</div>' +
          (taskDescription ? '<div style="margin-top:6px;color:#64748B;">' + escapeHtml(taskDescription) + '</div>' : '') +
          '<div style="margin-top:8px;font-size:13px;"><strong>Due:</strong> ' + escapeHtml(formattedDate) + '</div>' +
          '<div style="font-size:13px;"><strong>Client:</strong> ' + escapeHtml(clientName) + '</div>' +
        '</div>',
      cta: appUrl ? { label: 'View clients', url: appUrl + '/clients' } : undefined,
    });
  },

  meetingInvite: function (data) {
    const clientName = (data && data.clientName) || 'there';
    const agentName = (data && data.agentName) || 'Your CRM agent';
    const title = (data && data.title) || 'Meeting invitation';
    const date = data && data.date;
    const duration = (data && data.duration) || '';
    const location = (data && data.location) || '';
    const mode = (data && data.mode) || '';
    const agenda = data && data.agenda;
    const meetingLink = data && data.meetingLink;
    const formatDate = date
      ? new Date(date).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
      : '';

    return buildEmail({
      accent: BRAND.primary,
      eyebrow: 'Meeting invitation',
      title: title,
      preheader: 'Invited by ' + agentName,
      body:
        '<p style="margin:0 0 16px;">Hello <strong>' + escapeHtml(clientName) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">You have been invited to a meeting by <strong>' + escapeHtml(agentName) + '</strong>.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' +
          (title ? '<tr><td style="padding:10px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Title</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E2E8F0;">' + escapeHtml(title) + '</td></tr>' : '') +
          (formatDate ? '<tr><td style="padding:10px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Date & time</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E2E8F0;">' + escapeHtml(formatDate) + '</td></tr>' : '') +
          (duration ? '<tr><td style="padding:10px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Duration</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E2E8F0;">' + escapeHtml(duration) + ' minutes</td></tr>' : '') +
          (location ? '<tr><td style="padding:10px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Location</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E2E8F0;">' + escapeHtml(location) + '</td></tr>' : '') +
          (mode ? '<tr><td style="padding:10px 16px;color:#64748B;border-bottom:1px solid #E2E8F0;">Type</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E2E8F0;">' + escapeHtml(mode.toUpperCase()) + '</td></tr>' : '') +
        '</table>' +
        (meetingLink ? '<p style="margin:8px 0;"><strong>Link:</strong> <a href="' + escapeAttr(meetingLink) + '" style="color:' + BRAND.primary + ';">' + escapeHtml(meetingLink) + '</a></p>' : '') +
        (agenda ? '<div style="margin:16px 0;padding:14px 18px;border-left:4px solid ' + BRAND.primary + ';border-radius:8px;background:' + BRAND.primarySoft + ';"><strong>Agenda:</strong><br/>' + escapeHtml(agenda) + '</div>' : ''),
      cta: meetingLink ? { label: 'Join meeting', url: meetingLink } : undefined,
    });
  },

  clientEmail: function (data) {
    const clientName = (data && data.clientName) || 'there';
    const agentName = (data && data.agentName) || 'Your CRM agent';
    const subject = (data && data.subject) || 'Message from your CRM agent';
    const message = (data && data.message) || '';
    return buildEmail({
      accent: BRAND.primary,
      eyebrow: 'New message',
      title: subject,
      preheader: 'Message from ' + agentName,
      body:
        '<p style="margin:0 0 16px;">Hello <strong>' + escapeHtml(clientName) + '</strong>,</p>' +
        '<div style="margin:16px 0;padding:18px 20px;border-left:4px solid ' + BRAND.primary + ';border-radius:10px;background:#F8FAFC;white-space:pre-wrap;">' + escapeHtml(message) + '</div>' +
        '<p style="margin:8px 0 0;color:' + BRAND.muted + ';font-size:13px;">Sent by ' + escapeHtml(agentName) + ' via ' + BRAND.name + '.</p>',
    });
  },
};

// ===========================================================================
// SEND FUNCTIONS
// ===========================================================================

export const sendEmail = async function (to, templateName, templateData) {
  console.log('[EmailService] sendEmail called | to=' + to + ' | template=' + templateName);
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      console.error('[EmailService] Template not found: ' + templateName);
      return { success: false, error: 'Email template "' + templateName + '" not found' };
    }

    const emailContent = template(templateData || {});
    console.log('[EmailService] Subject: ' + emailContent.subject);

    console.log('[EmailService] Gmail check: EMAIL_USER=' + (process.env.EMAIL_USER || '') + ' EMAIL_PASS=' + ((process.env.EMAIL_PASS || '').length > 0 ? 'set' : 'missing'));
    // ---- TRY GMAIL FIRST ----
    let gmailError = null;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        console.log('[EmailService] Using Gmail credentials: ' + process.env.EMAIL_USER);
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: String(process.env.EMAIL_SECURE) === 'true',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
          tls: { rejectUnauthorized: false },
        });

        const fromName = 'Xtreative CRM';
        const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@xtreative.com';
        const mailOptions = {
          from: '"' + fromName + '" <' + fromAddress + '>',
          to: to,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.html.replace(/<[^>]*>/g, ''),
          headers: {
            'Reply-To': fromAddress,
            'X-Mailer': 'Xtreative CRM Mailer',
            'X-Priority': '3',
            'List-Unsubscribe': '<mailto:unsubscribe@xtreative.com>, <https://xtreative.com/unsubscribe>',
          },
        };
        console.log('[EmailService] Sending via Gmail | from=' + mailOptions.from + ' | to=' + mailOptions.to);
        const result = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(result);
        console.log('[EmailService] Gmail SUCCESS | messageId=' + result.messageId + ' | preview=' + (previewUrl || 'N/A'));
        console.log('[EmailService] Accepted=' + (result.accepted || []) + ' Rejected=' + (result.rejected || []));
        return { success: true, messageId: result.messageId, previewUrl };
      } catch (gmailErr) {
        gmailError = gmailErr;
        console.error('[EmailService] Gmail sending failed: ' + gmailErr.message);
        if (gmailErr.code) console.error('[EmailService] Gmail error code: ' + gmailErr.code);
        if (gmailErr.response) console.error('[EmailService] Gmail server response: ' + gmailErr.response);
        console.log('[EmailService] Not retrying. Aborting send to avoid silent failure.');
      }
    } else {
      console.error('[EmailService] EMAIL_USER or EMAIL_PASS missing in env. Cannot send email.');
    }

    // Fail closed so callers know email was not sent
    console.error('[EmailService] Email not sent.');
    return { success: false, error: gmailError ? gmailError.message : 'Email credentials missing' };
  } catch (error) {
    console.error('[EmailService] Unexpected error sending email: ' + error.message);
    if (error.code) console.error('[EmailService] Error code: ' + error.code);
    if (error.response) console.error('[EmailService] Server response: ' + error.response);
    return { success: false, error: error.message };
  }
};

export const testEmailConfig = async function () {
  try {
    console.log('[EmailService] Testing email configuration...');
    const transporter = await createTransporter();
    await transporter.verify();
    console.log('[EmailService] SMTP connection verified successfully!');
    return true;
  } catch (error) {
    console.error('[EmailService] SMTP verification failed: ' + error.message);
    return false;
  }
};

export const sendEmailWithAttachment = async function (to, subject, htmlContent, attachments) {
  attachments = attachments || [];
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@xtreative.com',
      to: to,
      subject: subject,
      html: htmlContent || '<p>Please find the attached report.</p>',
      attachments: attachments,
    };
    const result = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(result);
    if (previewUrl) console.log('[EmailService] Email with attachment preview: ' + previewUrl);
    return { success: true, messageId: result.messageId, previewUrl: previewUrl };
  } catch (error) {
    console.error('[EmailService] sendEmailWithAttachment error: ' + error.message);
    return { success: false, error: error.message };
  }
};