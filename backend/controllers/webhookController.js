const crypto = require('crypto');
const Xendit = require('xendit-node');
const Booking = require('../models/bookingModel');

const XENDIT_SECRET_API_KEY = process.env.XENDIT_SECRET_API_KEY;
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

const xendit = new Xendit({ secretKey: XENDIT_SECRET_API_KEY });

const handleXenditWebhook = async (req, res) => {
  console.log('Xendit Webhook received. Headers:', req.headers);
  console.log('Xendit Webhook received. Body:', req.body);

  const xIncomingCallbackToken = req.headers['x-callback-token'];

  if (!xIncomingCallbackToken) {
    console.warn('X-Callback-Token header not found.');
    return res.status(401).json({ message: 'Unauthorized: X-Callback-Token missing' });
  }

  if (xIncomingCallbackToken !== XENDIT_WEBHOOK_TOKEN) {
    console.warn('X-Callback-Token mismatch. Possible tampering or incorrect secret key.');
    return res.status(401).json({ message: 'Unauthorized: Invalid X-Callback-Token' });
  }

  try {
    const event = req.body;
    console.log('Received Xendit webhook event:', event);

    let bookingId;
    let paymentStatus;
    let xenditPaidAt = null;

    switch (event.event) {
      case 'payment_intent.succeeded':
        console.log('Payment Intent succeeded:', event.data);
        bookingId = event.data.metadata?.bookingId; // Assuming bookingId is passed in metadata
        paymentStatus = 'paid';
        xenditPaidAt = new Date();
        break;
      case 'payment_intent.failed':
        console.log('Payment Intent failed:', event.data);
        bookingId = event.data.metadata?.bookingId;
        paymentStatus = 'failed';
        break;
      case 'ewallet.charge.succeeded':
        console.log('E-wallet charge succeeded:', event.data);
        bookingId = event.data.reference_id; // Assuming reference_id is bookingId for e-wallet charges
        paymentStatus = 'paid';
        xenditPaidAt = new Date();
        break;
      case 'ewallet.charge.failed':
        console.log('E-wallet charge failed:', event.data);
        bookingId = event.data.reference_id;
        paymentStatus = 'failed';
        break;
      default:
        console.log('Unhandled Xendit event type:', event.event);
        return res.status(200).json({ message: 'Unhandled event type' });
    }

    if (bookingId && paymentStatus) {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = paymentStatus;
        booking.paymentDetails.xenditStatus = event.event;
        if (xenditPaidAt) {
          booking.paymentDetails.xenditPaidAt = xenditPaidAt;
        }
        await booking.save();
        console.log(`Booking ${bookingId} updated to status: ${paymentStatus}`);
      } else {
        console.warn(`Booking ${bookingId} not found for webhook event.`);
      }
    }

    res.status(200).json({ message: 'Webhook received and processed' });
  } catch (error) {
    console.error('Error processing Xendit webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
};

module.exports = { handleXenditWebhook };