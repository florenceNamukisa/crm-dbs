import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'your-ethreal-user',
        pass: process.env.ETHEREAL_PASS || 'your-ethreal-password'
      }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate OTP (6-digit numeric code)
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Email templates - FIXED: Properly handle template data
const emailTemplates = {
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
    const transporter = createTransporter();
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

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Email details:`, { name: templateData.name, email: templateData.email, otp: templateData.otp });
    
    const result = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development' && result.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(result);
      console.log('📧 Email sent! Preview URL:', previewUrl);
    }

    console.log(`✅ Email sent successfully to ${to}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};