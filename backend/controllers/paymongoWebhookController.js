const crypto = require('crypto');
const Booking = require('../models/bookingModel');

// Prefer webhook secret returned by PayMongo when registering the webhook.
// Fallback to test secret if explicitly requested.
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET
  || process.env.PAYMONGO_TEST_SECRET_KEY
  || process.env.PAYMONGO_SECRET_KEY;

// Extract signature candidates from Paymongo-Signature header
function parseSignatureHeader(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return { timestamp: null, signatures: [] };
  const parts = headerValue.split(',').map(p => p.trim());
  let timestamp = null;
  const signatures = [];
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (!v) continue;
    const key = (k || '').toLowerCase();
    if (key === 't' || key === 'timestamp') timestamp = v;
    if (key === 's' || key === 'signature' || key === 'v1' || key === 'sha256') signatures.push(v);
  }
  // Fallback: whole header as a signature
  if (signatures.length === 0) signatures.push(headerValue);
  return { timestamp, signatures };
}

function verifySignature(rawBodyBuffer, headerValue, secret) {
  try {
    const { timestamp, signatures } = parseSignatureHeader(headerValue);
    if (!secret) return false;
    const rawBodyString = rawBodyBuffer ? rawBodyBuffer.toString('utf8') : '';

    // Strategy A: HMAC of raw body
    const hmacBody = crypto.createHmac('sha256', secret).update(rawBodyString).digest('hex');
    if (signatures.some(s => s.toLowerCase() === hmacBody.toLowerCase())) return true;

    // Strategy B: HMAC of "timestamp.payload" if timestamp present
    if (timestamp) {
      const payload = `${timestamp}.${rawBodyString}`;
      const hmacTs = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (signatures.some(s => s.toLowerCase() === hmacTs.toLowerCase())) return true;
    }

    return false;
  } catch (err) {
    console.error('Error verifying PayMongo signature:', err);
    return false;
  }
}

function getEventType(body) {
  return body?.data?.attributes?.type || body?.type || body?.event || body?.data?.attributes?.event || 'unknown';
}

function extractResource(body) {
  // Common PayMongo webhook structures
  return body?.data?.attributes?.data || body?.data?.data || body?.data?.attributes?.object || body?.data || body?.resource || body;
}

function extractIdentifiers(resource) {
  if (!resource || typeof resource !== 'object') return {};
  const ids = {};
  // Try common keys
  ids.payment_intent_id = resource.payment_intent_id || resource.payment_intent || resource?.attributes?.payment_intent_id;
  ids.source_id = resource.source_id || resource.source || resource?.attributes?.source_id;
  ids.reference_number = resource.reference_number || resource?.attributes?.reference_number || resource?.referenceId || resource?.reference_id;
  ids.id = resource.id || resource?.attributes?.id;
  return ids;
}

async function updateBookingStatusByIdentifiers(ids, statusLabel, eventType, fullBody) {
  let booking = null;

  // Try matching by stored PayMongo ids
  if (!booking && ids.payment_intent_id) {
    booking = await Booking.findOne({ paymongoPaymentIntentId: ids.payment_intent_id });
  }
  if (!booking && ids.source_id) {
    booking = await Booking.findOne({ paymongoSourceId: ids.source_id });
  }
  // Try matching by reference number
  if (!booking && ids.reference_number) {
    booking = await Booking.findOne({ referenceNumber: ids.reference_number });
  }
  // Fallback: none found
  if (!booking) return { found: false };

  booking.paymongoStatus = statusLabel;
  booking.paymentDetails = booking.paymentDetails || {};
  booking.paymentDetails.paymongo = {
    ...(booking.paymentDetails.paymongo || {}),
    eventType,
    lastUpdateAt: new Date(),
    payloadPreview: {
      payment_intent_id: ids.payment_intent_id || null,
      source_id: ids.source_id || null,
      reference_number: ids.reference_number || null,
      id: ids.id || null,
    }
  };
  await booking.save();
  return { found: true, booking };
}

exports.handlePaymongoWebhook = async (req, res) => {
  try {
    console.log('[PayMongo] Webhook received');
    console.log('[PayMongo] Headers:', req.headers);
    console.log('[PayMongo] Raw body length:', req.rawBody ? req.rawBody.length : 0);
    console.log('[PayMongo] Body:', req.body);

    const sigHeader = req.headers['paymongo-signature'] || req.headers['Paymongo-Signature'] || req.headers['PAYMONGO-SIGNATURE'];
    const isValid = verifySignature(req.rawBody, sigHeader, PAYMONGO_WEBHOOK_SECRET);
    console.log('[PayMongo] Signature valid?', isValid);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid Signature' });
    }

    const eventType = getEventType(req.body);
    const resource = extractResource(req.body);
    const ids = extractIdentifiers(resource);
    console.log('[PayMongo] Event:', eventType, '\nIDs:', ids);

    let statusLabel = null;
    switch (eventType) {
      case 'payment.paid':
        statusLabel = 'Paid';
        break;
      case 'payment.failed':
        statusLabel = 'Failed';
        break;
      case 'qrph.expired':
        statusLabel = 'QR Expired';
        break;
      default:
        console.log('[PayMongo] Unhandled event type:', eventType);
        return res.status(200).json({ message: 'Unhandled event type' });
    }

    const result = await updateBookingStatusByIdentifiers(ids, statusLabel, eventType, req.body);
    if (!result.found) {
      console.warn('[PayMongo] No matching booking found for webhook.');
      return res.status(200).json({ message: 'No matching booking found' });
    }

    // Mark paymentStatus as paid when we receive paid event
    if (statusLabel === 'Paid') {
      try {
        result.booking.paymentStatus = 'paid';
        await result.booking.save();
      } catch (e) {
        console.warn('[PayMongo] Unable to set paymentStatus to paid:', e?.message);
      }
    }

    console.log('[PayMongo] Booking updated:', {
      id: result.booking._id?.toString?.(),
      referenceNumber: result.booking.referenceNumber,
      paymongoStatus: result.booking.paymongoStatus
    });
    return res.status(200).json({ message: 'Webhook received and processed' });
  } catch (err) {
    console.error('[PayMongo] Error handling webhook:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
