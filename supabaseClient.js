const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabaseInstance = null;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url.trim(), key.trim());
  }

  return supabaseInstance;
}

function isSupabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

function mapTxnToSupabase(txn) {
  return {
    id: txn.id,
    group_id: txn.groupId,
    group_name: txn.groupName || `Group ${txn.groupId}`,
    pair_id: txn.pairId || 1,
    target_upi_id: txn.targetUpiId || null,
    amount: parseFloat(txn.amount) || 0,
    payer_name: txn.payerName || 'Anonymous',
    payer_email: txn.payerEmail,
    payer_phone: txn.payerPhone || null,
    note: txn.role ? `${txn.role}` : (txn.note || 'Contribution'),
    status: txn.status || 'pending',
    payment_method: txn.paymentMethod || 'upi',
    razorpay_payment_id: txn.razorpayPaymentId || null,
    email_sent: !!txn.emailSent,
    email_sent_at: txn.emailSentAt || null,
    email_error: txn.emailError || null,
    created_at: txn.createdAt || new Date().toISOString(),
    completed_at: txn.completedAt || null
  };
}

async function syncToSupabase(txn) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, configured: false };
  }

  try {
    const row = mapTxnToSupabase(txn);
    const { data, error } = await supabase
      .from('payments')
      .upsert(row, { onConflict: 'id' })
      .select();

    if (error) {
      console.warn('[Supabase] Warning syncing transaction to Supabase:', error.message);
      return { success: false, configured: true, error: error.message };
    }

    console.log(`[Supabase] ✅ Transaction ${txn.id} synced to Supabase (Status: ${txn.status})`);
    return { success: true, configured: true, data };
  } catch (err) {
    console.error('[Supabase] Sync error:', err.message);
    return { success: false, configured: true, error: err.message };
  }
}

async function fetchSupabasePayments(filters = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let query = supabase.from('payments').select('*').order('created_at', { ascending: false });

    if (filters.groupId) {
      query = query.eq('group_id', filters.groupId.toUpperCase());
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase] Fetch error:', err.message);
    return null;
  }
}

async function fetchSupabaseSummary() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('group_collection_summary').select('*');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[Supabase] Summary error:', err.message);
    return null;
  }
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
  syncToSupabase,
  fetchSupabasePayments,
  fetchSupabaseSummary
};
