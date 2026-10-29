require('dotenv').config();

const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwHdzEnaihOFeTXXJS3bNhtY7CO4fvhXLLZ_cPOWUC_QMQyDogqkEd5HO6fiQAPtF9H/exec';

function getWebhookUrl() {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  return (url && url.trim().startsWith('http')) ? url.trim() : null;
}

/**
 * Appends a confirmed transaction directly into Google Sheets in real-time.
 * Uses a lightweight Google Apps Script Web App webhook.
 */
async function appendPaymentToGoogleSheet(txn) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return { success: false, configured: false };
  }

  try {
    const payload = {
      timestamp: new Date(txn.completedAt || txn.createdAt || Date.now()).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'medium'
      }),
      id: txn.id,
      group: `Group ${txn.groupId}`,
      department: txn.department || 'N/A',
      role: txn.role || txn.note || 'Contributor',
      amount: parseFloat(txn.amount) || 0,
      paymentMethod: txn.paymentMethod || 'UPI',
      payerName: txn.payerName || 'Anonymous',
      payerEmail: txn.payerEmail || '',
      payerPhone: txn.payerPhone || '',
      remarks: txn.remarks || '',
      status: txn.status || 'completed'
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const resultText = await res.text();
    console.log(`[GoogleSheet] ✅ Synced transaction ${txn.id} to Google Sheet:`, resultText);
    return { success: true, configured: true, response: resultText };
  } catch (err) {
    console.warn('[GoogleSheet] Warning syncing to Google Sheet:', err.message);
    return { success: false, configured: true, error: err.message };
  }
}

/**
 * Backfills all completed transactions into Google Sheet
 */
async function syncAllCompletedToSheet(transactions = []) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return { success: false, configured: false, message: 'Google Sheet webhook URL is not configured' };
  }

  const completed = transactions.filter(t => t.status === 'completed');
  let synced = 0;

  for (const txn of completed) {
    const res = await appendPaymentToGoogleSheet(txn);
    if (res.success) synced++;
  }

  return { success: true, configured: true, total: completed.length, synced };
}

module.exports = {
  appendPaymentToGoogleSheet,
  syncAllCompletedToSheet
};
