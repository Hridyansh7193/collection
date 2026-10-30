const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { GROUPS, getGroup, validateGroupPassword, getSafeGroupsList } = require('./config');
const store = require('./store');
const emailService = require('./emailService');
const paymentService = require('./paymentService');
const supabaseClient = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
store.initDb();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/QR', express.static(path.join(__dirname, 'QR')));
app.use('/qrs', express.static(path.join(__dirname, 'public', 'qrs')));

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

const ROLE_MINIMUMS = {
  'HOD': 2000,
  'Professor': 2000,
  'Associate Professor': 2000,
  'Additional Professor': 2000,
  'Senior Resident': 1500,
  'Junior Resident': 1500,
  'Others': 0
};

// 3. Create QR Code for Contribution
app.post('/api/collection/create-qr', async (req, res) => {
  try {
    const { groupId, password, amount, payerName, payerEmail, payerPhone, role, department, remarks } = req.body;

    if (!groupId || !password) {
      return res.status(401).json({ success: false, message: 'Group authentication required.' });
    }

    if (!validateGroupPassword(groupId, password)) {
      return res.status(401).json({ success: false, message: 'Invalid group password.' });
    }

    const group = getGroup(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!department) {
      return res.status(400).json({ success: false, message: 'Please select a Medical Department from the dropdown.' });
    }

    if (!role || ROLE_MINIMUMS[role] === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select a valid Designation / Role (HOD, Professor, Associate Professor, Additional Professor, Senior Resident, Junior Resident, or Others).' 
      });
    }

    const minAllowed = ROLE_MINIMUMS[role];
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || (minAllowed > 0 && numericAmount < minAllowed)) {
      return res.status(400).json({ 
        success: false, 
        message: minAllowed > 0
          ? `Minimum deposit value for ${role} is ₹${minAllowed.toLocaleString('en-IN')}. The amount can be increased but not lowered.` 
          : 'Please enter a valid contribution amount greater than ₹0.'
      });
    }

    if (!payerEmail || !payerEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid contributor email address is required for sending the confirmation.' });
    }

    const txnId = generateTxnId(group.id);
    const cleanRemarks = remarks && typeof remarks === 'string' ? remarks.trim().substring(0, 500) : '';
    const noteContent = cleanRemarks 
      ? `${department.trim()} | ${role} | ${cleanRemarks}` 
      : `${department.trim()} | ${role}`;

    const qrResult = await paymentService.generatePaymentQr({
      txnId,
      amount: numericAmount,
      groupId: group.id,
      groupName: group.name,
      note: `${department.trim()} - ${role}`,
      payerName: payerName || '',
      payerEmail: payerEmail.trim()
    });

    const newTxn = {
      id: txnId,
      groupId: group.id,
      groupName: group.name,
      amount: numericAmount,
      department: department.trim(),
      role: role,
      remarks: cleanRemarks,
      payerName: payerName ? payerName.trim() : 'Anonymous Contributor',
      payerEmail: payerEmail.trim(),
      payerPhone: payerPhone ? payerPhone.trim() : '',
      note: noteContent,
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

    // Stored strictly in internal database and synced to cloud
    await store.saveTransaction(newTxn);

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

// 3b. Record Cash Payment directly (No QR code generated)
app.post('/api/collection/record-cash', async (req, res) => {
  try {
    const { groupId, password, amount, payerName, payerEmail, payerPhone, role, department, remarks } = req.body;

    if (!groupId || !password) {
      return res.status(401).json({ success: false, message: 'Group authentication required.' });
    }

    if (!validateGroupPassword(groupId, password)) {
      return res.status(401).json({ success: false, message: 'Invalid group password.' });
    }

    const group = getGroup(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!department) {
      return res.status(400).json({ success: false, message: 'Please select a Medical Department from the dropdown.' });
    }

    if (!role || ROLE_MINIMUMS[role] === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select a valid Designation / Role (HOD, Professor, Associate Professor, Additional Professor, Senior Resident, Junior Resident, or Others).' 
      });
    }

    const minAllowed = ROLE_MINIMUMS[role];
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || (minAllowed > 0 && numericAmount < minAllowed)) {
      return res.status(400).json({ 
        success: false, 
        message: minAllowed > 0
          ? `Minimum deposit value for ${role} is ₹${minAllowed.toLocaleString('en-IN')}. The amount can be increased but not lowered.` 
          : 'Please enter a valid contribution amount greater than ₹0.'
      });
    }

    if (!payerEmail || !payerEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid contributor email address is required for sending the confirmation.' });
    }

    const txnId = generateTxnId(group.id);
    const cleanRemarks = remarks && typeof remarks === 'string' ? remarks.trim().substring(0, 500) : '';
    const noteContent = cleanRemarks 
      ? `${department.trim()} | ${role} | ${cleanRemarks}` 
      : `${department.trim()} | ${role}`;

    const newTxn = {
      id: txnId,
      groupId: group.id,
      groupName: group.name,
      amount: numericAmount,
      department: department.trim(),
      role: role,
      remarks: cleanRemarks,
      payerName: payerName ? payerName.trim() : 'Anonymous Contributor',
      payerEmail: payerEmail.trim(),
      payerPhone: payerPhone ? payerPhone.trim() : '',
      note: noteContent,
      status: 'completed',
      paymentMethod: 'Cash (Collector Received)',
      pairId: group.pairId || 1,
      pairLabel: 'Cash Payment',
      targetUpiId: null,
      razorpayOrderId: null,
      razorpayPaymentId: 'CASH-' + Date.now().toString(36).toUpperCase(),
      emailSent: false,
      emailSentAt: null,
      emailError: null,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    // Send confirmation email receipt directly to the contributor
    const emailResult = await emailService.sendConfirmationEmail(newTxn);
    newTxn.emailSent = emailResult.success;
    newTxn.emailSentAt = emailResult.success ? new Date().toISOString() : null;
    newTxn.emailError = emailResult.error || null;

    // Save to database, sync to Supabase, and sync to Google Sheet
    await store.saveTransaction(newTxn);

    res.json({
      success: true,
      message: `Cash contribution of ₹${numericAmount} successfully accepted, recorded, and receipt emailed!`,
      transaction: newTxn,
      emailResult
    });
  } catch (err) {
    console.error('Error recording cash payment:', err);
    res.status(500).json({ success: false, message: 'Failed to record cash payment: ' + err.message });
  }
});

// 4. Check Transaction Status
app.get('/api/collection/status/:txnId', async (req, res) => {
  const txn = await store.getTransaction(req.params.txnId);
  if (!txn) {
    return res.status(404).json({ success: false, message: 'Transaction not found.' });
  }
  res.json({ success: true, transaction: txn });
});

// 5. Complete / Confirm Payment and Trigger Real Email
app.post('/api/collection/confirm-payment', async (req, res) => {
  try {
    const { txnId, paymentId, paymentMethod } = req.body;
    const txn = await store.getTransaction(txnId);

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

    // Save to database, sync to Supabase, and sync to Google Sheet
    await store.saveTransaction(txn);

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
    const txn = await store.getTransaction(txnId);

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

    await store.saveTransaction(txn);

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

// 7. Manual Sync / Backfill all Completed Payments to Google Sheet
app.get('/api/admin/sync-google-sheet', async (req, res) => {
  try {
    const googleSheetService = require('./googleSheetService');
    const db = store.readDb();
    const txnsMap = new Map();

    // 1. Add local transactions
    (db.transactions || []).filter(t => t.status === 'completed').forEach(t => txnsMap.set(t.id, t));

    // 2. Add/merge Supabase cloud records (especially useful on Vercel serverless)
    try {
      const spRows = await supabaseClient.fetchSupabasePayments({ status: 'completed' });
      if (spRows && spRows.length > 0) {
        for (const row of spRows) {
          if (!txnsMap.has(row.id)) {
            txnsMap.set(row.id, {
              id: row.id,
              groupId: row.group_id,
              groupName: row.group_name,
              amount: row.amount,
              department: (row.note || '').split(' - ')[0] || '',
              role: (row.note || '').split(' | ')[0] || '',
              remarks: row.remarks || '',
              payerName: row.payer_name,
              payerEmail: row.payer_email,
              payerPhone: row.payer_phone,
              paymentMethod: row.payment_method,
              status: row.status,
              completedAt: row.completed_at || row.created_at
            });
          }
        }
      }
    } catch (spErr) {
      console.warn('[SyncSheet] Notice fetching Supabase records for backfill:', spErr.message);
    }

    const allCompleted = Array.from(txnsMap.values());
    const result = await googleSheetService.syncAllCompletedToSheet(allCompleted);
    res.json(result);
  } catch (err) {
    console.error('Error syncing to Google Sheet:', err);
    res.status(500).json({ success: false, message: 'Sync error: ' + err.message });
  }
});

// Fallback route to serve frontend on all web requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start local server if not running as a Vercel Serverless Function
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const supabaseClient = require('./supabaseClient');
    console.log(`🚀 Money Collection Platform running on http://localhost:${PORT}`);
    console.log(`📁 Local Database: database.json`);
    console.log(`☁️ Supabase PostgreSQL: ${supabaseClient.isSupabaseConfigured() ? 'Connected & Syncing' : 'Ready (set SUPABASE_URL & SUPABASE_ANON_KEY in .env)'}`);
  });
}

// Export for Vercel Serverless Function
module.exports = app;
