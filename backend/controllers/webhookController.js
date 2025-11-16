const crypto = require('crypto');
const axios = require('axios');
const Xendit = require('xendit-node');
const Booking = require('../models/bookingModel');

const XENDIT_SECRET_API_KEY = process.env.XENDIT_SECRET_API_KEY;
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

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

/**
 * Handle PayMongo webhook events
 * Docs: https://paymongo.com/docs/#webhooks (signature verification)
 */
const handlePayMongoWebhook = async (req, res) => {
  try {
    console.log('PayMongo Webhook received. Headers:', req.headers);
    const signatureHeader = req.headers['paymongo-signature'];
    if (!signatureHeader) {
      console.warn('PayMongo-Signature header missing');
      return res.status(400).json({ message: 'Signature header missing' });
    }

    if (!PAYMONGO_WEBHOOK_SECRET) {
      console.error('PAYMONGO_WEBHOOK_SECRET not configured');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    // Parse signature header format: "t=timestamp,v1=signature"
    const parts = signatureHeader.split(',').map(p => p.trim());
    let timestamp;
    let signatures = [];
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      console.warn('Invalid PayMongo-Signature header format');
      return res.status(400).json({ message: 'Invalid signature header' });
    }

    // Compute expected signature: HMAC_SHA256(timestamp + "." + rawBody)
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', PAYMONGO_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    // Validate signature
    if (!signatures.includes(computedSignature)) {
      console.warn('PayMongo signature mismatch');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const envelope = req.body;
    console.log('Verified PayMongo webhook event:', JSON.stringify(envelope, null, 2));

    // PayMongo webhook structure: { data: { id, type: 'event', attributes: { type: '<event.type>', data: { ...resource } } } }
    const evt = envelope?.data;
    const evtType = evt?.attributes?.type; // e.g., 'payment.paid', 'source.chargeable', 'payment.failed', 'qrph.expired'
    const resource = evt?.attributes?.data; // the underlying resource (payment or source)
    const attributes = resource?.attributes || {};

    // Determine bookingId - set via metadata when creating source/payment
    const bookingId = attributes?.metadata?.bookingId || attributes?.source?.data?.attributes?.metadata?.bookingId;

    if (!bookingId) {
      console.warn('Booking ID not found in webhook payload');
      return res.status(200).json({ message: 'No bookingId in payload' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.warn(`Booking ${bookingId} not found`);
      return res.status(200).json({ message: 'Booking not found' });
    }

    // Handle specific event types
    if (evtType === 'payment.paid') {
      booking.paymentStatus = 'paid';
      booking.paymongoPaymentId = resource?.id || booking.paymongoPaymentId;
      booking.paymentAmount = (attributes?.amount ? attributes.amount / 100 : booking.paymentAmount);
      await booking.save();
      console.log(`Booking ${bookingId} marked as paid via PayMongo`);
    } else if (evtType === 'payment.failed') {
      // Keep as pending to allow retrial; schema doesn't include 'failed'
      booking.paymentStatus = 'pending';
      await booking.save();
      console.log(`Booking ${bookingId} remains pending (payment failed)`);
    } else if (evtType === 'qrph.expired') {
      // QRPh source expired; allow reattempt by keeping pending
      booking.paymentStatus = 'pending';
      await booking.save();
      console.log(`Booking ${bookingId} remains pending (QRPh expired)`);
    } else if (evtType === 'source.chargeable') {
      // When a source becomes chargeable, attempt to create a payment
      try {
        const sourceId = resource?.id;
        const amount = attributes?.amount;
        const currency = attributes?.currency || 'PHP';

        if (!process.env.PAYMONGO_SECRET_KEY) {
          console.error('PAYMONGO_SECRET_KEY not configured');
        } else if (sourceId && amount) {
          const payload = {
            data: {
              attributes: {
                amount,
                currency,
                description: `Booking ${bookingId}`,
                source: { id: sourceId, type: 'source' },
                metadata: { bookingId }
              }
            }
          };
          const authString = Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64');
          const payRes = await axios.post('https://api.paymongo.com/v1/payments', payload, {
            headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authString}` }
          });
          const payData = payRes?.data?.data;
          if (payData?.id) {
            booking.paymongoPaymentId = payData.id;
            booking.paymentAmount = (payData?.attributes?.amount ? payData.attributes.amount / 100 : booking.paymentAmount);
            // keep status pending; will flip to paid on payment.paid event
            await booking.save();
            console.log(`Created PayMongo payment ${payData.id} for booking ${bookingId}`);
          }
        }
      } catch (err) {
        console.error('Error creating PayMongo payment from chargeable source:', err?.response?.data || err.message);
      }
    } else {
      console.log('Unhandled PayMongo event type:', evtType);
    }

    res.status(200).json({ message: 'PayMongo webhook processed' });
  } catch (error) {
    console.error('Error processing PayMongo webhook:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { handleXenditWebhook, handlePayMongoWebhook };