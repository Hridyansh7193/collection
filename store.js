const fs = require('fs');
const path = require('path');
const supabaseClient = require('./supabaseClient');

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

function saveTransaction(txn) {
  const db = readDb();
  const index = db.transactions.findIndex(t => t.id === txn.id);
  if (index >= 0) {
    db.transactions[index] = { ...db.transactions[index], ...txn };
  } else {
    db.transactions.unshift(txn);
  }
  writeDb(db);

  // Asynchronously sync to Supabase Cloud PostgreSQL
  supabaseClient.syncToSupabase(txn).catch(err => {
    console.warn('[Store] Supabase background sync notice:', err.message);
  });

  return txn;
}

function getTransaction(id) {
  const db = readDb();
  return db.transactions.find(t => t.id === id) || inMemoryTransactions.find(t => t.id === id) || null;
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
