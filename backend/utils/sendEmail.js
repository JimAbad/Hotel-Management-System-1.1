const nodemailer = require('nodemailer');
const axios = require('axios');

async function sendEmail({ to, subject, html, text }) {
  const provider = process.env.EMAIL_PROVIDER || 'smtp';
  const fromEmail = process.env.FROM_EMAIL;
  const fromName = process.env.FROM_NAME || 'Lumine Hotel';

  // Prefer Brevo HTTP API if configured
  if (provider.toLowerCase() === 'brevo' && process.env.BREVO_API_KEY) {
    if (!fromEmail) {
      throw new Error('FROM_EMAIL is required for Brevo and must be a verified sender');
    }

    const payload = {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    };

    const { data } = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    return data;
  }

  // Fallback to SMTP (e.g., Gmail or other relay)
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const smtpFromEmail = fromEmail || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
  }

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporter.verify();

  const info = await transporter.sendMail({
    from: `${fromName} <${smtpFromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  return info;
}

module.exports = sendEmail;