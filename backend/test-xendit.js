const Xendit = require('xendit-node');

const x = new Xendit({
  secretKey: 'xnd_development_QnA4LaCY76eYZFfz5DT3RNt5pgr7iD9Oz5RzirQq9haI3Xsam3z3eteZfGypqY',
});

const ewalletService = new x.EWallet;

async function testEWalletCharge() {
  try {
    const payload = {
      referenceID: 'test-booking-123',
      currency: 'PHP',
      amount: 1000,
      checkoutMethod: 'ONE_TIME_PAYMENT',
      channelCode: 'PH_GCASH',
      channelProperties: {
    success_return_url: 'http://localhost:5173/payment-success?bookingId=test-booking-123',
    failure_return_url: 'http://localhost:5173/payment-failed?bookingId=test-booking-123'
  },
      customer: {
        reference_id: 'customer-123',
        given_names: 'John Doe',
        email: 'john@example.com',
        mobile_number: '09123456789'
      }
    };

    console.log('Testing payload:', JSON.stringify(payload, null, 2));
    
    const result = await ewalletService.createEWalletCharge(payload);
    console.log('Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  }
}

testEWalletCharge();