const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      transactions: [],
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { transactions: [], updatedAt: new Date().toISOString() };
  }
}

function writeDb(data) {
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
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
  return txn;
}

function getTransaction(id) {
  const db = readDb();
  return db.transactions.find(t => t.id === id) || null;
}

function getTransactionsByGroup(groupId) {
  const db = readDb();
  if (!groupId) return db.transactions;
  const upper = groupId.toUpperCase();
  return db.transactions.filter(t => t.groupId === upper);
}

module.exports = {
  initDb,
  readDb,
  saveTransaction,
  getTransaction,
  getTransactionsByGroup
};
