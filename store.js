const fs = require('fs');
const path = require('path');
const supabaseClient = require('./supabaseClient');
const googleSheetService = require('./googleSheetService');

// On Vercel / serverless environments, only /tmp is writable
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_FILE = isServerless
  ? path.join('/tmp', 'database.json')
  : path.join(__dirname, 'database.json');

let inMemoryTransactions = [];

function initDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        transactions: [],
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Store] DB init notice (using memory/Supabase):', err.message);
  }
}

function readDb() {
  try {
    initDb();
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions)) {
        inMemoryTransactions = parsed.transactions;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Store] DB read notice:', err.message);
  }
  return { transactions: inMemoryTransactions, updatedAt: new Date().toISOString() };
}

function writeDb(data) {
  try {
    data.updatedAt = new Date().toISOString();
    inMemoryTransactions = data.transactions || [];
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] DB write notice:', err.message);
  }
}

async function saveTransaction(txn) {
  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === txn.id);
  if (index >= 0) {
    db.transactions[index] = { ...db.transactions[index], ...txn };
  } else {
    db.transactions.unshift(txn);
  }
  writeDb(db);

  // Sync to Cloud Destinations and await completion (critical for Vercel serverless)
  const syncTasks = [];

  // 1. Supabase Cloud Sync
  syncTasks.push(
    supabaseClient.syncToSupabase(txn).catch(err => {
      console.warn('[Store] Supabase sync error:', err.message);
      return { success: false, error: err.message };
    })
  );

  // 2. Google Sheet Sync (when transaction is completed)
  if (txn.status === 'completed') {
    syncTasks.push(
      googleSheetService.appendPaymentToGoogleSheet(txn).catch(err => {
        console.warn('[Store] Google Sheet sync error:', err.message);
        return { success: false, error: err.message };
      })
    );
  }

  // Await all cloud sync tasks before returning
  await Promise.allSettled(syncTasks);

  return txn;
}

async function getTransaction(id) {
  const db = readDb();
  let txn = db.transactions.find(t => t.id === id) || inMemoryTransactions.find(t => t.id === id) || null;
  if (txn) return txn;

  // Serverless fallback: Query Supabase directly if container was recycled
  try {
    const supabase = supabaseClient.getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
      if (data && !error) {
        return {
          id: data.id,
          groupId: data.group_id,
          groupName: data.group_name,
          pairId: data.pair_id,
          targetUpiId: data.target_upi_id,
          amount: parseFloat(data.amount) || 0,
          payerName: data.payer_name,
          payerEmail: data.payer_email,
          payerPhone: data.payer_phone,
          note: data.note,
          remarks: data.remarks || '',
          status: data.status,
          paymentMethod: data.payment_method,
          razorpayPaymentId: data.razorpay_payment_id,
          emailSent: !!data.email_sent,
          emailSentAt: data.email_sent_at,
          emailError: data.email_error,
          createdAt: data.created_at,
          completedAt: data.completed_at
        };
      }
    }
  } catch (err) {
    console.warn('[Store] Supabase fallback getTransaction notice:', err.message);
  }

  return null;
}

function getTransactionsByGroup(groupId) {
  const db = readDb();
  const list = db.transactions.length ? db.transactions : inMemoryTransactions;
  if (!groupId) return list;
  const upper = groupId.toUpperCase();
  return list.filter(t => t.groupId === upper);
}

module.exports = {
  initDb,
  readDb,
  saveTransaction,
  getTransaction,
  getTransactionsByGroup
};
