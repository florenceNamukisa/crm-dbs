import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let cachedConfigSummary = null;
let cachedEtherealAccount = null;

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const service = process.env.EMAIL_SERVICE;
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
    const secure = process.env.EMAIL_SECURE === 'true';

    const transportConfig = {
      connectionTimeout: process.env.EMAIL_CONNECTION_TIMEOUT ? Number(process.env.EMAIL_CONNECTION_TIMEOUT) : 10000,
      greetingTimeout: process.env.EMAIL_GREETING_TIMEOUT ? Number(process.env.EMAIL_GREETING_TIMEOUT) : 10000,
      socketTimeout: process.env.EMAIL_SOCKET_TIMEOUT ? Number(process.env.EMAIL_SOCKET_TIMEOUT) : 15000,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    };

    if (host) {
      transportConfig.host = host;
      transportConfig.port = port || 587;
      transportConfig.secure = secure;
    } else {
      transportConfig.service = service || 'gmail';
    }

    cachedTransporter = nodemailer.createTransport(transportConfig);
    cachedConfigSummary = {
      provider: transportConfig.service || transportConfig.host || 'custom',
      user: process.env.EMAIL_USER,
    };
    return cachedTransporter;
  }

  if (!cachedEtherealAccount) {
    if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
      cachedEtherealAccount = {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      };
      cachedConfigSummary = { provider: 'ethereal:env', user: cachedEtherealAccount.user };
    } else {
      cachedEtherealAccount = await nodemailer.createTestAccount();
      cachedConfigSummary = { provider: 'ethereal:auto', user: cachedEtherealAccount.user };
      console.log('No SMTP credentials supplied - using temporary Ethereal account.');
      console.log('   Username: ' + cachedEtherealAccount.user);
      console.log('   Password: ' + cachedEtherealAccount.pass);
    }
  }

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: cachedEtherealAccount,
  });
  return cachedTransporter;
};

export const getEmailConfigSummary = () => cachedConfigSummary;

// 6-digit numeric OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ===========================================================================
// SHARED EMAIL DESIGN SYSTEM
// One polished, responsive layout used by every transactional email.
// Brand colors and spacing are centralised so the look is consistent.
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
  return (
    'rgba(' + parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' +
    parseInt(m[3], 16) + ', ' + alpha + ')'
  );
}

// ---------------------------------------------------------------------------
// buildEmail({ accent, eyebrow, title, body, cta, footerNote, preheader })
// Returns { subject, html }
//
// - accent     : header gradient color (defaults to brand orange)
// - eyebrow    : small text above the title (e.g. "Welcome aboard")
// - title      : bold header line
// - body       : HTML string for the message body (use <p>, <ul>, etc.)
// - cta        : { label, url } optional call-to-action button
// - footerNote : optional small text under the body
// - preheader  : hidden preview text shown in inbox list
// ---------------------------------------------------------------------------
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
          // Header
          '<tr><td style="background:linear-gradient(135deg,' + accent + ' 0%,' + BRAND.primaryDark + ' 100%);padding:36px 40px;">' +
            '<div style="display:inline-block;background:rgba(255,255,255,0.18);color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;">' + escapeHtml(eyebrow) + '</div>' +
            '<h1 style="margin:14px 0 0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;">' + escapeHtml(title) + '</h1>' +
          '</td></tr>' +
          // Body
          '<tr><td style="padding:36px 40px 8px;font-size:15px;line-height:1.6;color:' + BRAND.text + ';">' + body + '</td></tr>' +
          // CTA
          (cta
            ? '<tr><td align="center" style="padding:24px 40px 8px;">' +
                '<a href="' + escapeAttr(cta.url) + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:' + accent + ';color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 30px;border-radius:10px;box-shadow:0 6px 16px ' + hexToRgba(accent, 0.35) + ';">' + escapeHtml(cta.label) + '</a>' +
              '</td></tr>'
            : '') +
          // Footer note
          (footerNote
            ? '<tr><td style="padding:8px 40px 0;font-size:13px;line-height:1.55;color:' + BRAND.muted + ';">' + footerNote + '</td></tr>'
            : '') +
          // Divider
          '<tr><td style="padding:32px 40px 0;"><div style="height:1px;background:' + BRAND.border + ';"></div></td></tr>' +
          // Footer
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

// ---------------------------------------------------------------------------
// Reusable content blocks (render to HTML strings, plugged into `body`)
// ---------------------------------------------------------------------------

function otpBlock(code, label) {
  label = label || 'Your one-time code';
  return (
    '<div style="margin:24px 0 8px;text-align:center;">' +
      '<div style="font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:' + BRAND.muted + ';">' + escapeHtml(label) + '</div>' +
      '<div style="display:inline-block;margin-top:10px;padding:18px 28px;font-family:\'SF Mono\',\'Menlo\',\'Consolas\',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:' + BRAND.primary + ';background:' + BRAND.primarySoft + ';border:2px dashed ' + BRAND.primary + ';border-radius:12px;">' + escapeHtml(code) + '</div>' +
      '<div style="margin-top:10px;font-size:12px;color:' + BRAND.muted + ';">This code expires in <strong>15 minutes</strong>.</div>' +
    '</div>'
  );
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

function infoRow(label, value) {
  return (
    '<tr>' +
      '<td style="padding:10px 16px;font-size:13px;color:' + BRAND.muted + ';width:40%;border-bottom:1px solid ' + BRAND.border + ';">' + escapeHtml(label) + '</td>' +
      '<td style="padding:10px 16px;font-size:14px;color:' + BRAND.text + ';font-weight:600;border-bottom:1px solid ' + BRAND.border + ';">' + escapeHtml(value) + '</td>' +
    '</tr>'
  );
}

function infoTable(rows) {
  const body = rows.map(function (r) { return infoRow(r[0], r[1]); }).join('');
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ' + BRAND.border + ';border-radius:12px;overflow:hidden;">' +
      '<tr><td colspan="2" style="padding:0;"></td></tr>' +
      body +
    '</table>'
  );
}

// ===========================================================================
// TEMPLATE REGISTRY
// ===========================================================================

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
        '<p style="margin:0 0 16px;">Your tenant admin account has been created. Use the credentials below to sign in to your CRM workspace right away.</p>' +
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
        '<p style="margin:0 0 16px;">We received a request to reset the password for your ' + BRAND.name + ' account. Use the code below to continue. If you did not make this request, you can safely ignore this email.</p>' +
        otpBlock(otp, 'Password reset code') +
        '<p style="margin:16px 0 0;color:' + BRAND.muted + ';font-size:13px;">For your security, this code expires in <strong>15 minutes</strong> and can only be used once.</p>',
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
    const badge = isOverdue ? 'Overdue' : 'Due soon';

    return buildEmail({
      accent: accent,
      eyebrow: badge,
      title: isOverdue ? 'Task overdue' : 'Task reminder',
      preheader: taskTitle + ' for ' + clientName,
      body:
        '<p style="margin:0 0 16px;">Hi <strong>' + escapeHtml(agentName) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">You have a task <strong>' + (isOverdue ? 'that is overdue' : 'coming up') + '</strong> for client <strong>' + escapeHtml(clientName) + '</strong>.</p>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ' + BRAND.border + ';border-left:4px solid ' + accent + ';border-radius:10px;background:#F8FAFC;">' +
          '<tr><td style="padding:18px 20px;">' +
            '<div style="font-weight:600;font-size:15px;color:' + BRAND.text + ';margin-bottom:6px;">' + escapeHtml(taskTitle) + '</div>' +
            (taskDescription ? '<div style="color:' + BRAND.muted + ';font-size:14px;margin-bottom:8px;">' + escapeHtml(taskDescription) + '</div>' : '') +
            '<div style="font-size:13px;color:' + BRAND.text + ';"><strong>Due:</strong> ' + escapeHtml(formattedDate) + '</div>' +
            '<div style="font-size:13px;color:' + BRAND.text + ';"><strong>Client:</strong> ' + escapeHtml(clientName) + '</div>' +
          '</td></tr>' +
        '</table>' +
        '<p style="margin:8px 0 0;color:' + BRAND.muted + ';font-size:13px;">' + (isOverdue ? 'This task is past its due date - please action it as soon as possible.' : 'Please complete this task on time to keep your client relationship on track.') + '</p>',
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
    const modeLabel = (mode || 'meeting').toString().replace('-', ' ');

    return buildEmail({
      accent: BRAND.primary,
      eyebrow: 'Meeting invitation',
      title: title,
      preheader: 'Invited by ' + agentName,
      body:
        '<p style="margin:0 0 16px;">Hello <strong>' + escapeHtml(clientName) + '</strong>,</p>' +
        '<p style="margin:0 0 16px;">You have been invited to a meeting by <strong>' + escapeHtml(agentName) + '</strong>. Please find the details below.</p>' +
        infoTable([
          ['Title', title],
          ['Date & time', formatDate],
          ['Duration', String(duration) + ' minutes'],
          ['Location', location],
          ['Type', modeLabel.toUpperCase()],
        ].filter(function (r) { return r[1]; })) +
        (meetingLink ? '<p style="margin:8px 0 0;font-size:14px;"><strong>Meeting link:</strong> <a href="' + escapeAttr(meetingLink) + '" style="color:' + BRAND.primary + ';">' + escapeHtml(meetingLink) + '</a></p>' : '') +
        (agenda ? '<div style="margin:16px 0;padding:14px 18px;border:1px solid ' + BRAND.border + ';border-left:4px solid ' + BRAND.primary + ';border-radius:8px;background:' + BRAND.primarySoft + ';"><div style="font-weight:600;margin-bottom:6px;">Agenda</div><div style="white-space:pre-wrap;">' + escapeHtml(agenda) + '</div></div>' : ''),
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
        '<div style="margin:16px 0;padding:18px 20px;border:1px solid ' + BRAND.border + ';border-left:4px solid ' + BRAND.primary + ';border-radius:10px;background:#F8FAFC;white-space:pre-wrap;">' + escapeHtml(message) + '</div>' +
        '<p style="margin:8px 0 0;color:' + BRAND.muted + ';font-size:13px;">Sent by ' + escapeHtml(agentName) + ' via ' + BRAND.name + '.</p>',
    });
  },
};

// ===========================================================================
// SEND FUNCTIONS
// ===========================================================================

export const sendEmail = async function (to, templateName, templateData) {
  try {
    const transporter = await createTransporter();
    const template = emailTemplates[templateName];
    if (!template) throw new Error('Email template "' + templateName + '" not found');

    const emailContent = template(templateData || {});

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@xtreative.com',
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    const result = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(result);
    if (previewUrl) console.log('Email preview:', previewUrl);

    return { success: true, messageId: result.messageId, previewUrl: previewUrl };
  } catch (error) {
    console.error('Email sending error:', error.message);
    return { success: false, error: error.message };
  }
};

export const testEmailConfig = async function () {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
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
    if (previewUrl) console.log('Email preview:', previewUrl);
    return { success: true, messageId: result.messageId, previewUrl: previewUrl };
  } catch (error) {
    console.error('sendEmailWithAttachment error:', error.message);
    return { success: false, error: error.message };
  }
};
