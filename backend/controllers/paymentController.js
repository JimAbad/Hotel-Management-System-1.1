const Booking = require('../models/bookingModel');

const Xendit = require('xendit-node');
const x = new Xendit({ secretKey: process.env.XENDIT_SECRET_API_KEY });
const paymentIntentService = x.PaymentIntent;
const { EWallet } = x;
const ewalletService = new EWallet({});
const axios = require('axios');
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_API_KEY || process.env.PAYMONGO_TEST_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    const xenditPaymentIntent = await paymentIntentService.createPaymentIntent({
      amount: amount,
      currency: currency,
      paymentMethodAllowed: ['GCASH', 'PAYMAYA', 'GRABPAY'], // Xendit uses uppercase for e-wallets
      description: description,
      // Add other necessary Xendit payment intent parameters here
    });

    res.status(201).json({ client_secret: xenditPaymentIntent.client_intent_id, paymentIntentId: xenditPaymentIntent.id });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId, paymentDetails, paymentMethodId } = req.body;
    const { amount } = paymentDetails;
    const amountInCents = Math.round(parseFloat(amount)); // Convert to cents
    console.log('Booking ID:', bookingId);
    console.log('Amount:', amount);
    console.log('Amount in Cents:', amountInCents);
    console.log('Payment Method ID:', paymentMethodId);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    let xenditPaymentIntent;
    const allowedMethods = ['GCASH', 'PAYMAYA', 'GRABPAY'];

    if (paymentMethodId) {
      xenditPaymentIntent = await paymentIntentService.createPaymentIntent({
        amount: amountInCents,
        currency: 'PHP',
        paymentMethodAllowed: allowedMethods,
        paymentMethod: paymentMethodId,
        description: `Payment for booking ${bookingId}`,
        captureType: 'AUTOMATIC',
      });
      console.log('Created Xendit Payment Intent with payment method:', xenditPaymentIntent);

      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedPaymentIntent = await paymentIntentService.getPaymentIntentById({ id: xenditPaymentIntent.id });
        console.log(`Attempt ${attempts + 1} - Xendit Payment Intent Status:`, updatedPaymentIntent.status);
        xenditPaymentIntent = updatedPaymentIntent;

        if (xenditPaymentIntent.status === 'SUCCEEDED') {
          console.log('Payment succeeded!');
          break;
        } else if (xenditPaymentIntent.status === 'PENDING') {
          console.log('Payment is still processing, waiting...');
          attempts++;
        } else if (xenditPaymentIntent.status === 'REQUIRES_ACTION') {
          console.log('Payment requires next action (3D Secure)');
          break;
        } else if (xenditPaymentIntent.status === 'CANCELED') {
          console.log('Payment was canceled');
          break;
        } else {
          console.log('Unexpected payment status:', xenditPaymentIntent.status);
          break;
        }
      }

      if (attempts >= maxAttempts && xenditPaymentIntent.status !== 'SUCCEEDED') {
        console.log('Payment processing timeout - payment may still be processing');
      }

    } else {
      xenditPaymentIntent = await paymentIntentService.createPaymentIntent({
        amount: amountInCents,
        currency: 'PHP',
        paymentMethodAllowed: allowedMethods,
        description: `Payment for booking ${bookingId}`,
      });
      console.log('Created Xendit Payment Intent without payment method:', xenditPaymentIntent);
    }

    let paymentStatus = 'pending';
    let xenditPaidAt = null;

    if (xenditPaymentIntent.status === 'SUCCEEDED') {
      paymentStatus = 'paid';
      xenditPaidAt = new Date();
    } else if (xenditPaymentIntent.status === 'PENDING') {
      paymentStatus = 'processing';
    } else if (xenditPaymentIntent.status === 'REQUIRES_ACTION') {
      paymentStatus = 'requires_action';
    } else if (xenditPaymentIntent.status === 'CANCELED') {
      paymentStatus = 'failed';
    }

    booking.paymentStatus = paymentStatus;
    booking.paymentDetails = {
      paymentIntentId: xenditPaymentIntent.id,
      clientKey: xenditPaymentIntent.client_intent_id,
      paymentMethodId: paymentMethodId || null,
      xenditAmount: amountInCents,
      xenditCurrency: 'PHP',
      xenditStatus: xenditPaymentIntent.status,
      xenditCreated: new Date(),
      xenditPaidAt: xenditPaidAt
    };
    await booking.save();

    let message = 'Payment processing initiated';
    if (xenditPaymentIntent.status === 'SUCCEEDED') {
      message = 'Payment processed successfully';
    } else if (xenditPaymentIntent.status === 'PENDING') {
      message = 'Payment is being processed';
    } else if (xenditPaymentIntent.status === 'REQUIRES_ACTION') {
      message = 'Payment requires authentication';
    } else if (xenditPaymentIntent.status === 'CANCELED') {
      message = 'Payment was canceled';
    }

    res.status(200).json({
      message: message,
      clientKey: xenditPaymentIntent.client_intent_id,
      paymentIntentId: xenditPaymentIntent.id,
      paymentStatus: xenditPaymentIntent.status,
      booking
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllBillings = async (req, res) => {
  console.log('getAllBillings function reached');
  try {
    const billings = await Booking.find({ user: req.user.id, paymentStatus: 'paid' }).populate('room');
    res.status(200).json(billings);
  } catch (error) {
    console.error('Error fetching billings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createPaymentMethod = async (req, res, next) => {
  const { type, details } = req.body;

  try {
    let paymentMethod;
    if (type === 'CARD') {
      paymentMethod = await x.PaymentMethod.createPaymentMethod({
        type: 'CARD',
        card: {
          cardNumber: details.cardNumber,
          expiryMonth: details.expiryMonth,
          expiryYear: details.expiryYear,
          cvn: details.cvn,
        },
        customer: req.user ? {
          referenceId: req.user.id, // Assuming user is authenticated and has an ID
          givenNames: req.user.name, // Assuming user has a name
          email: req.user.email, // Assuming user has an email
        } : undefined,
      });
    } else if (type === 'EWALLET') {
      paymentMethod = await x.PaymentMethod.createPaymentMethod({
        type: 'EWALLET',
        ewallet: {
          channelCode: details.channelCode,
          channelProperties: {
            mobileNumber: details.mobileNumber,
          },
        },
        customer: req.user ? {
          referenceId: req.user.id,
          givenNames: req.user.name,
          email: req.user.email,
        } : undefined,
      });
    } else {
      return next(new ErrorResponse('Invalid payment method type', 400));
    }

    res.status(201).json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error('Error creating payment method:', error);
    next(new ErrorResponse('Failed to create payment method', 500));
  }
};

exports.createEWalletPaymentSource = async (req, res, next) => {
  try {
    let { channelCode, amount, currency = 'PHP', bookingId, successReturnUrl, failureReturnUrl } = req.body;

    // Convert channelCode to Xendit's expected format for payment requests API
    // For payment requests, we use the channel codes without PH_ prefix
    if (channelCode && channelCode.startsWith('PH_')) {
      channelCode = channelCode.substring(3); // Remove PH_ prefix
    }
    console.log('Channel code after conversion:', channelCode);

    console.log('Creating e-wallet payment source:', { channelCode, amount, currency, bookingId, successReturnUrl, failureReturnUrl });

    // Validate required fields
    if (!channelCode || !amount || !bookingId) {
      return res.status(400).json({
        message: 'Missing required fields',
        error: 'channelCode, amount, and bookingId are required'
      });
    }

    // Validate e-wallet channel code

    // Validate e-wallet channel code for payment requests API
    const validEwalletChannelCodes = ['GCASH', 'PAYMAYA', 'GRABPAY'];
    if (!validEwalletChannelCodes.includes(channelCode)) {
      return res.status(400).json({
        message: 'Invalid e-wallet channel code. Supported: GCASH, PAYMAYA, GRABPAY',
        error: 'Invalid payment channel code'
      });
    }

    const amountInCents = Math.round(parseFloat(amount));
    console.log('Amount in cents:', amountInCents);

    // Add customer details if available
    const customer = req.user ? {
      referenceID: req.user.id,
      givenNames: req.user.name,
      email: req.user.email,
    } : {
      referenceID: bookingId,
      givenNames: 'Guest User',
      email: 'guest@example.com',
    };

    // Prepare channel properties based on channel code
    const channelProperties = {
      success_return_url: successReturnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5175'}/payment-success?bookingId=${bookingId}`,
      failure_return_url: failureReturnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5175'}/payment-failed?bookingId=${bookingId}`
    };

    // Add mobile number for e-wallet channels that require it
    if (req.body.mobileNumber) {
      channelProperties.mobile_number = req.body.mobileNumber;
    }

    // Use the newer Payment Requests API format
    const paymentRequestPayload = {
      amount: amountInCents,
      currency: currency,
      payment_method: {
        type: 'EWALLET',
        reusability: 'ONE_TIME_USE',
        ewallet: {
          channel_code: channelCode,
          channel_properties: channelProperties
        }
      },
      reference_id: bookingId
    };
    
    // Add cancel_return_url for PAYMAYA
    if (channelCode === 'PAYMAYA') {
      paymentRequestPayload.payment_method.ewallet.channel_properties.cancel_return_url = 
        `${process.env.FRONTEND_URL || 'http://localhost:5175'}/payment-cancelled?bookingId=${bookingId}`;
    }
    
    console.log('Payment request payload:', JSON.stringify(paymentRequestPayload, null, 2));

    // Use direct API call to create payment request
    const axios = require('axios');
    const response = await axios.post('https://api.xendit.co/payment_requests', paymentRequestPayload, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(process.env.XENDIT_SECRET_API_KEY + ':').toString('base64'),
        'Content-Type': 'application/json',
        'API-Version': '2022-07-07'
      }
    });
    
    const paymentRequest = response.data;
    console.log('Xendit payment request created:', paymentRequest);

    console.log('Xendit payment request created:', paymentRequest);

    if (paymentRequest.actions && paymentRequest.actions.length > 0) {
      const redirectAction = paymentRequest.actions.find(action => action.action === 'AUTH');
      if (redirectAction && redirectAction.url) {
        console.log('Redirect URL found:', redirectAction.url);
        res.status(201).json({
          message: 'E-wallet payment source created successfully',
          paymentSource: paymentRequest,
          redirectUrl: redirectAction.url
        });
      } else {
        throw new Error('No redirect URL found in Xendit payment request actions');
      }
    } else {
      throw new Error('No actions found in Xendit payment request response');
    }

  } catch (error) {
    console.error('Error creating e-wallet payment source:', error);
    
    // Check if this is a Xendit API error
    if (error.status) {
      // Pass through Xendit API errors with their original status code
      return res.status(error.status).json({
        message: error.message || 'Xendit API error',
        error: error.code || 'API_ERROR'
      });
    }
    
    // For other errors, return 500
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

// New: return stored payment details for a booking (used by route /paymongo-details/:bookingId)
exports.getPayMongoPaymentDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId parameter is required' });
    }

    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.paymentDetails) {
      return res.status(404).json({ message: 'Payment details not found for this booking' });
    }

    // Fallback: if webhook hasn’t updated yet, query PayMongo intent status directly
    try {
      const currentStatus = booking.paymentStatus;
      const piId = booking.paymentDetails?.paymentIntentId;
      if (piId && currentStatus !== 'paid' && currentStatus !== 'failed' && currentStatus !== 'expired') {
        const basicAuth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');
        const headers = { 'Authorization': `Basic ${basicAuth}` };
        const piGet = await axios.get(`https://api.paymongo.com/v1/payment_intents/${piId}`, { headers });
        const piAttrs = piGet.data?.data?.attributes || {};
        const piStatus = piAttrs.status;

        if (piStatus === 'succeeded') {
          const dp = booking.paymentDetails?.downpaymentAmount;
          const total = booking.totalAmount || 0;
          const isPartial = dp && total && dp < total;
          booking.paymentStatus = isPartial ? 'partial' : 'paid';
          booking.status = 'confirmed';
          booking.paymentDetails = booking.paymentDetails || {};
          booking.paymentDetails.paymongoStatus = 'payment.paid';
          booking.paymentDetails.paymongoPaidAt = new Date();
          booking.paymentDetails.paymongoPaymentIntentId = piId;

          // Mark room occupied
          try {
            const Room = require('../models/roomModel');
            const room = await Room.findById(booking.room);
            if (room) {
              room.status = 'occupied';
              await room.save();
            }
          } catch (roomErr) {
            console.error('Failed to set room occupied after PayMongo PI success:', roomErr);
          }

          await booking.save();
        } else if (piStatus === 'cancelled') {
          booking.paymentStatus = 'failed';
          booking.paymentDetails = booking.paymentDetails || {};
          booking.paymentDetails.paymongoStatus = 'payment.failed';
          await booking.save();
        } else if (piStatus === 'expired') {
          booking.paymentStatus = 'expired';
          booking.paymentDetails = booking.paymentDetails || {};
          booking.paymentDetails.paymongoStatus = 'qrph.expired';
          await booking.save();
        }
      }
    } catch (fallbackErr) {
      console.warn('PayMongo fallback status check failed:', fallbackErr?.response?.data || fallbackErr?.message);
    }

    return res.status(200).json({ paymentDetails: booking.paymentDetails, booking });
  } catch (error) {
    console.error('Error in getPayMongoPaymentDetails:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Initiate PayMongo QRPh payment: creates payment intent + qrph payment method and attaches
exports.initiatePaymongoQrPh = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId).populate('room');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const downpayment = booking.paymentDetails?.downpaymentAmount;
    const chargeAmount = (downpayment != null && !isNaN(downpayment) && downpayment > 0)
      ? downpayment
      : (booking.totalAmount || 0);
    const amountInCentavos = Math.round(chargeAmount * 100);
    if (!amountInCentavos || amountInCentavos <= 0) {
      return res.status(400).json({ message: 'Invalid booking amount' });
    }

    const basicAuth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`
    };

    // 1) Create Payment Intent allowing qrph
    const piResp = await axios.post('https://api.paymongo.com/v1/payment_intents', {
      data: {
        attributes: {
          amount: amountInCentavos,
          currency: 'PHP',
          capture_type: 'automatic',
          payment_method_allowed: ['qrph'],
          description: `Booking ${bookingId} payment`,
          metadata: { bookingId }
        }
      }
    }, { headers });

    const paymentIntent = piResp.data?.data?.attributes;
    const paymentIntentId = piResp.data?.data?.id;

    // 2) Create Payment Method type qrph
    const pmResp = await axios.post('https://api.paymongo.com/v1/payment_methods', {
      data: {
        attributes: {
          type: 'qrph',
          billing: {
            name: booking.customerName || booking.guestName || 'Guest',
            email: booking.customerEmail || 'guest@example.com',
            phone: booking.contactNumber || ''
          }
        }
      }
    }, { headers });

    const paymentMethodId = pmResp.data?.data?.id;

    // 3) Attach Payment Method to Intent and get QR
    const attachResp = await axios.post(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
      data: {
        attributes: {
          payment_method: paymentMethodId,
          return_url: `${FRONTEND_URL}/payment-status`
        }
      }
    }, { headers });

    const attached = attachResp.data?.data?.attributes;
    const nextAction = attached?.next_action || {};
    const qrDisplay = nextAction?.display_qr || {};
    const imageUrl = qrDisplay?.image_url || null;
    const qrExpiresAt = qrDisplay?.expires_at || attached?.expires_at || null;

    // Update booking payment details
    booking.paymentStatus = 'processing';
    booking.paymentDetails = {
      ...(booking.paymentDetails || {}),
      paymentIntentId: paymentIntentId,
      paymentMethodId,
      paymongoStatus: attached?.status || 'PENDING',
      qrImageUrl: imageUrl,
      qrExpiresAt,
      amount: amountInCentavos,
      currency: 'PHP'
    };
    await booking.save();

    return res.status(200).json({
      success: true,
      bookingId: booking._id,
      imageUrl,
      expiresAt: qrExpiresAt,
      paymentIntentId,
      paymentMethodId
    });
  } catch (error) {
    console.error('Error initiating PayMongo QRPh:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    return res.status(status).json({
      message: 'Failed to initiate PayMongo QRPh',
      error: error.response?.data || error.message
    });
  }
};

