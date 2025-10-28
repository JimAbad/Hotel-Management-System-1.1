const { sendEmail } = require('./utils/email');

async function testSendEmail() {
  console.log('Testing sendEmail with undefined to parameter...');
  
  try {
    await sendEmail({
      to: undefined,
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

testSendEmail();