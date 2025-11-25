const axios = require('axios');
const Booking = require('../models/bookingModel');

async function refreshPendingPaymongoIntents() {
  const secret = process.env.PAYMONGO_SECRET_KEY;
  if (!secret) {
    console.warn('[PayMongo] PAYMONGO_SECRET_KEY not configured; skipping status refresh');
    return { checked: 0, updated: 0 };
  }
  const auth = 'Basic ' + Buffer.from(`${secret}:`).toString('base64');
  const pending = await Booking.find({
    paymentStatus: 'pending',
    'paymentDetails.paymongoPaymentIntentId': { $exists: true, $ne: null }
  }).sort({ updatedAt: -1 }).limit(50);

  let checked = 0;
  let updated = 0;

  for (const booking of pending) {
    checked++;
    const intentId = booking.paymentDetails?.paymongoPaymentIntentId || booking.paymentDetails?.paymentIntentId;
    if (!intentId) continue;
    try {
      const resp = await axios.get(`https://api.paymongo.com/v1/payment_intents/${intentId}`, {
        headers: { 'Content-Type': 'application/json', Authorization: auth }
      });
      const attr = resp?.data?.data?.attributes || {};
      if (attr.status === 'succeeded') {
        const paidCentavos = attr.amount;
        const paidAmount = typeof paidCentavos === 'number' ? paidCentavos / 100 : booking.paymentAmount;
        booking.paymentAmount = paidAmount;
        const paymentId = Array.isArray(attr.payments) && attr.payments.length > 0 ? attr.payments[0]?.id : booking.paymongoPaymentId;
        if (paymentId) booking.paymongoPaymentId = paymentId;
        booking.paymentStatus = paidAmount < booking.totalAmount ? 'partial' : 'paid';
        await booking.save();
        updated++;
        console.log(`[PayMongo] Booking ${booking._id} marked ${booking.paymentStatus} via status refresher`);
      }
    } catch (err) {
      console.warn('[PayMongo] Status refresh failed for', intentId, err?.response?.data || err.message);
    }
  }

  return { checked, updated };
}

function startPaymongoStatusRefresher() {
  const INTERVAL = 60 * 1000; // every 1 minute
  console.log('[PayMongo] Starting status refresher...');
  refreshPendingPaymongoIntents().catch(console.error);
  setInterval(() => {
    refreshPendingPaymongoIntents().catch(console.error);
  }, INTERVAL);
  console.log(`[PayMongo] Status refresher scheduled every ${INTERVAL / 1000}s`);
}

module.exports = {
  refreshPendingPaymongoIntents,
  startPaymongoStatusRefresher
};

