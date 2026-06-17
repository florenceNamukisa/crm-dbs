import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

(async () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  console.log('EMAIL_USER:', user);
  console.log('EMAIL_PASS:', pass);
  if (!user || !pass) {
    console.error('Missing EMAIL_USER or EMAIL_PASS');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: String(process.env.EMAIL_SECURE) === 'true',
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to: user,
      subject: 'CRM Email Test',
      text: 'If you received this, SMTP is working.',
    });
    console.log('Sent messageId:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('Email test failed:', err.message);
    process.exit(1);
  }
})();