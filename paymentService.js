const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getGroupQrConfig } = require('./config');
require('dotenv').config();

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({
    key_id: key_id.trim(),
    key_secret: key_secret.trim()
  });
}

function isRazorpayConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function buildUpiString({ upiId, merchantName, amount, txnId, note }) {
  const cleanUpi = upiId || process.env.DEFAULT_UPI_ID || 'contribute@upi';
  const cleanName = merchantName || 'Contribution Drive';
  const cleanNote = note || `Contribution ${txnId}`;
  const formattedAmount = Number(amount).toFixed(2);

  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(cleanNote)}&tr=${encodeURIComponent(txnId)}`;
}

async function generatePaymentQr({ txnId, amount, groupId, groupName, note, payerName, payerEmail }) {
  const rzp = getRazorpayInstance();
  let razorpayOrderId = null;
  let paymentProvider = 'upi';

  // Retrieve the 5-QR configuration for this group
  const qrPairConfig = getGroupQrConfig(groupId);
  const targetUpiId = qrPairConfig ? qrPairConfig.upiId : (process.env.DEFAULT_UPI_ID || 'contribute@upi');
  const targetMerchantName = qrPairConfig ? qrPairConfig.merchantName : `${groupName} Contribution`;

  if (rzp) {
    try {
      const amountPaise = Math.round(Number(amount) * 100);
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: txnId,
        notes: {
          groupId,
          pairId: qrPairConfig ? qrPairConfig.pairId : 1,
          payerEmail,
          payerName: payerName || '',
          note: note || ''
        }
      });
      razorpayOrderId = order.id;
      paymentProvider = 'razorpay';
    } catch (rzpErr) {
      console.warn('[PaymentService] Razorpay order creation failed, falling back to direct UPI QR:', rzpErr.message);
    }
  }

  const upiString = buildUpiString({
    upiId: targetUpiId,
    merchantName: targetMerchantName,
    amount,
    txnId,
    note: `${groupId}: ${note || 'Contribution'}`
  });

  const qrDataUrl = await QRCode.toDataURL(upiString, {
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    qrDataUrl,
    qrPayload: upiString,
    paymentProvider,
    razorpayOrderId,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    pairId: qrPairConfig ? qrPairConfig.pairId : 1,
    pairLabel: qrPairConfig ? qrPairConfig.label : 'QR',
    targetUpiId,
    hasCustomImage: qrPairConfig ? qrPairConfig.hasCustomImage : false,
    customImageUrl: qrPairConfig ? qrPairConfig.customImageUrl : null
  };
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
}

module.exports = {
  getRazorpayInstance,
  isRazorpayConfigured,
  buildUpiString,
  generatePaymentQr,
  verifyRazorpaySignature
};
