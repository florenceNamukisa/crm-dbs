import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let cachedTransporter = null;
let cachedConfigSummary = null;
let cachedEtherealAccount = null;

const logEmailConfig = () => {
  if (!cachedConfigSummary) return;
};

const createTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  // Prefer real SMTP credentials when provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const service = process.env.EMAIL_SERVICE;
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
    const secure = process.env.EMAIL_SECURE === 'true';

    const transportConfig = {
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
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
      user: process.env.EMAIL_USER
    };
    logEmailConfig();
    return cachedTransporter;
  }

  // Fall back to Ethereal (auto-generate account when not supplied)
  if (!cachedEtherealAccount) {
    if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
      cachedEtherealAccount = {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS
      };
      cachedConfigSummary = { provider: 'ethereal:env', user: cachedEtherealAccount.user };
    } else {
      cachedEtherealAccount = await nodemailer.createTestAccount();
      cachedConfigSummary = { provider: 'ethereal:auto', user: cachedEtherealAccount.user };
      console.log('⚠️  No SMTP credentials supplied – generated temporary Ethereal account.');
      console.log(`   Username: ${cachedEtherealAccount.user}`);
      console.log(`   Password: ${cachedEtherealAccount.pass}`);
    }
  }

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: cachedEtherealAccount
  });

  logEmailConfig();
  return cachedTransporter;
};

export const getEmailConfigSummary = () => cachedConfigSummary;

// Generate OTP (6-digit numeric code)
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email templates - FIXED: Properly handle template data
const emailTemplates = {
  meetingInvite: (templateData) => {
    const { clientName, agentName, title, date, duration, location, mode, agenda, meetingLink } = templateData;

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    };

    const getModeIcon = (mode) => {
      switch (mode) {
        case 'zoom': return '📹';
        case 'google-meet': return '🎥';
        case 'teams': return '👥';
        case 'phone': return '📞';
        case 'in-person': return '🏢';
        default: return '📅';
      }
    };

    return {
      subject: `Meeting Invitation: ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #FF6B35, #FF8C42); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .meeting-details { background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 4px solid #FF6B35; margin: 25px 0; }
            .meeting-info { margin: 15px 0; }
            .meeting-info strong { display: inline-block; width: 120px; }
            .join-button {
              background: #FF6B35;
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              margin: 20px 0;
              font-size: 16px;
              font-weight: bold;
            }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
            .agenda { background: #fff8e1; padding: 15px; border-radius: 8px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 Meeting Invitation</h1>
              <p>${getModeIcon(mode)} ${title}</p>
            </div>

            <div class="content">
              <h2>Hello ${clientName},</h2>
              <p>You have been invited to a meeting by ${agentName}. Please find the details below:</p>

              <div class="meeting-details">
                <h3>📋 Meeting Details:</h3>
                <div class="meeting-info"><strong>Title:</strong> ${title}</div>
                <div class="meeting-info"><strong>Date & Time:</strong> ${formatDate(date)}</div>
                <div class="meeting-info"><strong>Duration:</strong> ${duration} minutes</div>
                <div class="meeting-info"><strong>Location/Mode:</strong> ${location}</div>
                <div class="meeting-info"><strong>Meeting Type:</strong> ${mode.replace('-', ' ').toUpperCase()}</div>
                ${meetingLink ? `<div class="meeting-info"><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank">${meetingLink}</a></div>` : ''}
              </div>

              ${agenda ? `
              <div class="agenda">
                <h4>📝 Agenda:</h4>
                <p>${agenda}</p>
              </div>
              ` : ''}

              ${meetingLink ? `
              <div style="text-align: center;">
                <a href="${meetingLink}" class="join-button" target="_blank">🔗 Join Meeting</a>
              </div>
              ` : ''}

              <div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p><strong>💡 Important:</strong> Please arrive 5 minutes early. If you need to reschedule, please contact ${agentName} directly.</p>
              </div>

              <div class="footer">
                <p>This meeting invitation was sent by the CRM System.</p>
                <p>Please add this event to your calendar to avoid missing it.</p>
                <p>© ${new Date().getFullYear()} CRM System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  agentWelcome: (templateData) => {
    const { name, email, otp } = templateData;
    
    return {
      subject: `Welcome to CRM System, ${name}! - Your Login Credentials`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #FF6B35, #FF8C42); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .welcome-text { font-size: 18px; margin-bottom: 20px; }
            .credentials { background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 4px solid #FF6B35; margin: 25px 0; }
            .otp-code { 
              font-family: 'Courier New', monospace; 
              font-size: 32px; 
              font-weight: bold; 
              color: #FF6B35; 
              text-align: center; 
              letter-spacing: 8px;
              margin: 20px 0;
              padding: 15px;
              background: #fff;
              border: 2px dashed #FF6B35;
              border-radius: 8px;
            }
            .login-info { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .steps { background: #fff8e1; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { margin: 10px 0; padding-left: 15px; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
            .button { 
              background: #FF6B35; 
              color: white; 
              padding: 15px 40px; 
              text-decoration: none; 
              border-radius: 8px; 
              display: inline-block; 
              margin: 20px 0; 
              font-size: 16px;
              font-weight: bold;
            }
            .info-box { background: #f0f7ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏢 CRM Pro System</h1>
              <p>Your Sales Performance Platform</p>
            </div>
            
            <div class="content">
              <h2>Welcome aboard, ${name}! 👋</h2>
              <p class="welcome-text">Your account has been successfully created in our CRM system. We're excited to have you on the team!</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials:</h3>
                <div class="login-info">
                  <p><strong>📧 Email:</strong> ${email}</p>
                  <p><strong>🔑 One-Time Password (OTP):</strong></p>
                  <div class="otp-code">${otp}</div>
                  <p><em>This OTP expires in 24 hours</em></p>
                </div>
              </div>

              <div class="steps">
                <h3>🚀 Getting Started:</h3>
                <div class="step">1. Go to the login page: <a href="http://localhost:3000/login">http://localhost:3000/login</a></div>
                <div class="step">2. Enter your email: <strong>${email}</strong></div>
                <div class="step">3. Use the OTP above as your password</div>
                <div class="step">4. You'll be prompted to create a new secure password</div>
                <div class="step">5. Start exploring your dashboard!</div>
              </div>

              <div class="info-box">
                <p><strong>💡 Security Tip:</strong> For security reasons, please change your password immediately after first login and don't share your credentials with anyone.</p>
              </div>

              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="button">🎯 Login to Your Dashboard</a>
              </div>

              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you didn't request this account, please contact your administrator immediately.</p>
                <p>© ${new Date().getFullYear()} CRM Pro System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }
};

// Send email function - FIXED: Proper template calling
export const sendEmail = async (to, templateName, templateData) => {
  try {
    const transporter = await createTransporter();
    const template = emailTemplates[templateName];
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Call the template function with the data
    const emailContent = template(templateData);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"CRM System" <noreply@crm-system.com>',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    
    const result = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(result);
    if (previewUrl) {
    }

    return { success: true, messageId: result.messageId, previewUrl };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};

// Send email with attachment
export const sendEmailWithAttachment = async (to, subject, htmlContent, attachments = []) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"CRM System" <noreply@crm-system.com>',
      to,
      subject,
      html: htmlContent || '<p>Please find the attached report.</p>',
      attachments
    };

    const result = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(result);
    if (previewUrl) {
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ sendEmailWithAttachment error:', error);
    return { success: false, error: error.message };
  }
};