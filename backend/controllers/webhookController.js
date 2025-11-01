const crypto = require('crypto');
const Xendit = require('xendit-node');
const Booking = require('../models/bookingModel');
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

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

        // If payment succeeded, confirm booking and mark room occupied
        if (paymentStatus === 'paid') {
          booking.status = 'confirmed';
          try {
            const room = await require('../models/roomModel').findById(booking.room);
            if (room) {
              room.status = 'occupied';
              await room.save();
            }
          } catch (roomErr) {
            console.error('Failed to set room occupied after Xendit payment:', roomErr);
          }
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

// PayMongo webhook handler
const handlePaymongoWebhook = async (req, res) => {
  try {
    const signatureHeader = req.get('Paymongo-Signature') || req.headers['paymongo-signature'];
    if (!signatureHeader) {
      console.warn('PayMongo-Signature header missing');
      return res.status(400).json({ message: 'Missing PayMongo-Signature header' });
    }

    // Parse header: e.g., "t=timestamp,te=signature" (test) or "li=" for live
    const sigParts = signatureHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=').map(s => s.trim());
      if (k) acc[k] = v;
      return acc;
    }, {});

    const timestamp = sigParts.t;
    const headerSignature = sigParts.li || sigParts.te; // Prefer live, fallback to test
    if (!timestamp || !headerSignature) {
      console.warn('Invalid PayMongo-Signature header format');
      return res.status(400).json({ message: 'Invalid PayMongo-Signature header' });
    }

    // Use raw body captured by express.json verify hook
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', PAYMONGO_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (expectedSignature !== headerSignature) {
      console.warn('PayMongo webhook signature mismatch');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event?.data?.attributes?.type || event?.type;
    const resource = event?.data?.attributes?.data;
    const attributes = resource?.attributes || {};

    // Attempt to extract bookingId from payment metadata or intent metadata
    let bookingId = attributes?.metadata?.bookingId
      || event?.data?.attributes?.data?.attributes?.metadata?.bookingId
      || event?.data?.attributes?.metadata?.bookingId;

    let paymentStatusUpdate = null;
    let paidAt = null;

    switch (eventType) {
      case 'payment.paid':
      case 'payment.success':
        paymentStatusUpdate = 'paid';
        paidAt = new Date();
        break;
      case 'payment.failed':
        paymentStatusUpdate = 'failed';
        break;
      case 'qrph.expired':
        paymentStatusUpdate = 'expired';
        break;
      default:
        console.log('Unhandled PayMongo event type:', eventType);
        return res.status(200).json({ message: 'Unhandled event type' });
    }

    if (!bookingId && attributes?.payment_intent_id) {
      // If bookingId not found, try resolve via PaymentIntent stored on a booking
      const possibleBooking = await Booking.findOne({ 'paymentDetails.paymentIntentId': attributes.payment_intent_id });
      if (possibleBooking) bookingId = possibleBooking._id;
    }

    if (bookingId && paymentStatusUpdate) {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        // If payment is paid but only a downpayment was charged, mark as partial
        let resolvedStatus = paymentStatusUpdate;
        if (paymentStatusUpdate === 'paid') {
          const dp = booking.paymentDetails?.downpaymentAmount;
          const total = booking.totalAmount || 0;
          if (dp && total && dp < total) {
            resolvedStatus = 'partial';
          }
        }
        booking.paymentStatus = resolvedStatus;
        booking.paymentDetails = booking.paymentDetails || {};
        booking.paymentDetails.paymongoStatus = eventType;
        booking.paymentDetails.paymongoPaymentId = resource?.id || attributes?.id;
        booking.paymentDetails.paymongoAmount = attributes?.amount;
        booking.paymentDetails.paymongoCurrency = attributes?.currency || 'PHP';
        booking.paymentDetails.paymongoPaymentIntentId = attributes?.payment_intent_id || booking.paymentDetails?.paymentIntentId;
        if (paidAt) booking.paymentDetails.paymongoPaidAt = paidAt;

        // If payment succeeded, confirm booking and mark room occupied
        if (paymentStatusUpdate === 'paid') {
          booking.status = 'confirmed';
          try {
            const room = await require('../models/roomModel').findById(booking.room);
            if (room) {
              room.status = 'occupied';
              await room.save();
            }
          } catch (roomErr) {
            console.error('Failed to set room occupied after PayMongo payment:', roomErr);
          }
        }

        await booking.save();
        console.log(`Booking ${bookingId} updated to status: ${booking.paymentStatus}`);
      } else {
        console.warn(`Booking ${bookingId} not found for PayMongo webhook event.`);
      }
    } else {
      console.warn('BookingId not found in PayMongo event.');
    }

    return res.status(200).json({ message: 'PayMongo webhook processed' });
  } catch (err) {
    console.error('Error processing PayMongo webhook:', err);
    return res.status(500).json({ message: 'Error processing PayMongo webhook' });
  }
};

module.exports.handlePaymongoWebhook = handlePaymongoWebhook;