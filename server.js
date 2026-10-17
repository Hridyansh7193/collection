const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { GROUPS, getGroup, validateGroupPassword, getSafeGroupsList } = require('./config');
const store = require('./store');
const emailService = require('./emailService');
const paymentService = require('./paymentService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
store.initDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function generateTxnId(groupId) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TXN-${groupId}-${dateStr}-${rand}`;
}

// 1. Get Groups List (Names & IDs only, no financial ledgers exposed)
app.get('/api/groups', (req, res) => {
  const groups = getSafeGroupsList();
  res.json({ success: true, groups });
});

// 2. Authenticate Group Collector
app.post('/api/auth/group-login', (req, res) => {
  const { groupId, password } = req.body;
  if (!groupId || !password) {
    return res.status(400).json({ success: false, message: 'Group ID and Password are required.' });
  }

  const isValid = validateGroupPassword(groupId, password);
  if (!isValid) {
    return res.status(401).json({ success: false, message: `Incorrect password for Group ${groupId.toUpperCase()}.` });
  }

  const group = getGroup(groupId);
  res.json({
    success: true,
    message: `Unlocked Group ${group.id} successfully!`,
    group: {
      id: group.id,
      name: group.name,
      color: group.color
    }
  });
});

// 3. Create QR Code for Contribution
app.post('/api/collection/create-qr', async (req, res) => {
  try {
    const { groupId, password, amount, payerName, payerEmail, payerPhone, note } = req.body;

    if (!groupId || !password) {
      return res.status(401).json({ success: false, message: 'Group authentication required.' });
    }

    if (!validateGroupPassword(groupId, password)) {
      return res.status(401).json({ success: false, message: 'Invalid group password.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid contribution amount greater than ₹0.' });
    }

    if (!payerEmail || !payerEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid contributor email address is required for sending the confirmation.' });
    }

    const group = getGroup(groupId);
    const txnId = generateTxnId(group.id);

    const qrResult = await paymentService.generatePaymentQr({
      txnId,
      amount: numericAmount,
      groupId: group.id,
      groupName: group.name,
      note: note || 'Contribution',
      payerName: payerName || '',
      payerEmail: payerEmail.trim()
    });

    const newTxn = {
      id: txnId,
      groupId: group.id,
      groupName: group.name,
      amount: numericAmount,
      payerName: payerName ? payerName.trim() : 'Anonymous Contributor',
      payerEmail: payerEmail.trim(),
      payerPhone: payerPhone ? payerPhone.trim() : '',
      note: note ? note.trim() : '',
      status: 'pending',
      paymentMethod: qrResult.paymentProvider,
      pairId: qrResult.pairId,
      pairLabel: qrResult.pairLabel,
      targetUpiId: qrResult.targetUpiId,
      razorpayOrderId: qrResult.razorpayOrderId,
      razorpayPaymentId: null,
      emailSent: false,
      emailSentAt: null,
      emailError: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    // Stored strictly in internal database
    store.saveTransaction(newTxn);

    res.json({
      success: true,
      transaction: newTxn,
      qrDataUrl: qrResult.qrDataUrl,
      qrPayload: qrResult.qrPayload,
      pairId: qrResult.pairId,
      pairLabel: qrResult.pairLabel,
      targetUpiId: qrResult.targetUpiId,
      hasCustomImage: qrResult.hasCustomImage,
      customImageUrl: qrResult.customImageUrl,
      razorpayOrderId: qrResult.razorpayOrderId,
      razorpayKeyId: qrResult.razorpayKeyId
    });
  } catch (err) {
    console.error('Error generating payment QR:', err);
    res.status(500).json({ success: false, message: 'Failed to generate payment QR: ' + err.message });
  }
});

// 4. Check Transaction Status
app.get('/api/collection/status/:txnId', (req, res) => {
  const txn = store.getTransaction(req.params.txnId);
  if (!txn) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }
  res.json({ success: true, transaction: txn });
});

// 5. Complete / Confirm Payment and Trigger Real Email
app.post('/api/collection/confirm-payment', async (req, res) => {
  try {
    const { txnId, paymentId, paymentMethod } = req.body;
    const txn = store.getTransaction(txnId);

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (txn.status === 'completed') {
      return res.json({ success: true, message: 'Transaction was already completed.', transaction: txn });
    }

    txn.status = 'completed';
    txn.completedAt = new Date().toISOString();
    if (paymentId) txn.razorpayPaymentId = paymentId;
    if (paymentMethod) txn.paymentMethod = paymentMethod;

    // Send confirmation email to the contributor email provided by the collector
    const emailResult = await emailService.sendConfirmationEmail(txn);
    txn.emailSent = emailResult.success;
    txn.emailSentAt = emailResult.success ? new Date().toISOString() : null;
    txn.emailError = emailResult.error || null;

    // Save strictly to local database
    store.saveTransaction(txn);

    res.json({
      success: true,
      message: `Payment confirmed for ₹${txn.amount}!`,
      transaction: txn,
      emailResult
    });
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ success: false, message: 'Error confirming payment: ' + err.message });
  }
});

// 6. Verify Razorpay Payment Signature
app.post('/api/collection/verify-razorpay', async (req, res) => {
  try {
    const { txnId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const txn = store.getTransaction(txnId);

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const isValid = paymentService.verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Razorpay signature verification failed.' });
    }

    txn.status = 'completed';
    txn.completedAt = new Date().toISOString();
    txn.razorpayPaymentId = razorpay_payment_id;
    txn.paymentMethod = 'razorpay';

    const emailResult = await emailService.sendConfirmationEmail(txn);
    txn.emailSent = emailResult.success;
    txn.emailSentAt = emailResult.success ? new Date().toISOString() : null;
    txn.emailError = emailResult.error || null;

    store.saveTransaction(txn);

    res.json({
      success: true,
      message: 'Payment verified and receipt email sent!',
      transaction: txn,
      emailResult
    });
  } catch (err) {
    console.error('Razorpay verification error:', err);
    res.status(500).json({ success: false, message: 'Razorpay verification error: ' + err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  const supabaseClient = require('./supabaseClient');
  console.log(`🚀 Money Collection Platform running on http://localhost:${PORT}`);
  console.log(`📁 Local Database: database.json`);
  console.log(`☁️ Supabase PostgreSQL: ${supabaseClient.isSupabaseConfigured() ? 'Connected & Syncing' : 'Ready (set SUPABASE_URL & SUPABASE_ANON_KEY in .env)'}`);
});
