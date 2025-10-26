const nodemailer = require('nodemailer');

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'no-reply@example.com';
const FROM_NAME = process.env.FROM_NAME || 'Lumine Hotel';
const DISABLE_EMAIL_SEND = process.env.DISABLE_EMAIL_SEND === 'true';

let transporter = null;

// Create SMTP transporter
if (!DISABLE_EMAIL_SEND && SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  
  console.log('[Email] SMTP transporter configured successfully');
} else if (DISABLE_EMAIL_SEND) {
  console.log('[Email] Email sending is disabled');
} else {
  console.warn('[Email] SMTP configuration incomplete. Email sending will be mocked.');
}

/**
 * Send an email via SMTP or mock service
 * @param {Object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject
 * @param {string} [opts.text] - Plain-text content
 * @param {string} [opts.html] - HTML content
 */
async function sendEmail({ to, subject, text, html }) {
  console.log('[Email] sendEmail called with parameters:', { to, subject, text: !!text, html: !!html });
  
  // Validate required parameters with robust checks
  const recipient = typeof to === 'string' ? to.trim() : '';
  const invalidRecipient = !recipient || recipient.toLowerCase() === 'undefined' || recipient.toLowerCase() === 'null' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient);
  if (invalidRecipient) {
    throw new Error(`Invalid recipient email: ${JSON.stringify(to)}`);
  }
  
  const messageData = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: recipient,
    subject,
    text,
    html,
    envelope: {
      from: FROM_EMAIL,
      to: [recipient]
    }
  };
  
  console.log('[Email] messageData:', { ...messageData, text: !!messageData.text, html: !!messageData.html });

  // Use mock email service if disabled or not configured
  if (DISABLE_EMAIL_SEND || !transporter) {
    console.log('\n=== MOCK EMAIL SERVICE ===');
    console.log('📧 Email would be sent:');
    console.log(`From: ${messageData.from}`);
    console.log(`To: ${messageData.to}`);
    console.log(`Subject: ${messageData.subject}`);
    console.log(`Text: ${messageData.text}`);
    if (messageData.html) {
      console.log(`HTML: ${messageData.html}`);
    }
    console.log('=========================\n');
    
    // Return a mock response
    return {
      messageId: `mock-${Date.now()}`,
      response: 'Mock email logged to console',
      accepted: [to],
      rejected: []
    };
  }

  // Use real SMTP service
  try {
    const info = await transporter.sendMail(messageData);
    console.log('[Email] Sent successfully:', { 
      to, 
      subject, 
      messageId: info.messageId,
      response: info.response 
    });
    return info;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    throw err;
  }
}

module.exports = { sendEmail };