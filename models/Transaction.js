import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'transactions';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const cleanTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim());
};

// Manual "populate" — enrich with account + category names
const enrich = async (tx) => {
  const db = getDb();
  const [account, category] = await Promise.all([
    tx.accountId
      ? db.collection('financialaccounts').findOne({ _id: tx.accountId })
      : null,
    tx.categoryId
      ? db.collection('categories').findOne({ _id: tx.categoryId })
      : null
  ]);
  return {
    ...tx,
    account: account
      ? {
          _id: account._id,
          accountName: account.accountName,
          accountType: account.accountType
        }
      : null,
    category: category
      ? {
          _id: category._id,
          categoryName: category.categoryName,
          type: category.type
        }
      : null
  };
};

// Apply a signed delta to an account's currentBalance
const applyBalanceDelta = async (accountId, delta) => {
  if (!accountId) return;
  const db = getDb();
  await db.collection('financialaccounts').updateOne(
    { _id: accountId },
    { $inc: { currentBalance: delta } }
  );
};

// Signed amount based on transaction type
const signedAmount = (type, amount) =>
  type === 'income' ? Math.abs(amount) : -Math.abs(amount);

// ─────────────────────────────────────────────
// GET all transactions
// ─────────────────────────────────────────────
const getAll = async () => {
  const db = getDb();
  const items = await db.collection(COLLECTION).find().toArray();
  return Promise.all(items.map(enrich));
};

// ─────────────────────────────────────────────
// GET one transaction by ID
// ─────────────────────────────────────────────
const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }
  return enrich(item);
};

// ─────────────────────────────────────────────
// POST — create transaction
// Only whitelisted fields are inserted.
// Also updates the linked account's currentBalance.
// ─────────────────────────────────────────────
const create = async (data) => {
  const db = getDb();

  const newTx = {
    userId: new ObjectId(data.userId),
    accountId: new ObjectId(data.accountId),
    categoryId: new ObjectId(data.categoryId),
    type: data.type,
    amount: Math.abs(Number(data.amount)),
    description: data.description.trim(),
    date: data.date ? new Date(data.date) : new Date(),
    paymentMethod: data.paymentMethod || 'other',
    notes: (data.notes || '').trim(),
    tags: cleanTags(data.tags),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).insertOne(newTx);

  // Sync balance on linked account
  await applyBalanceDelta(newTx.accountId, signedAmount(newTx.type, newTx.amount));

  return { _id: result.insertedId, ...newTx };
};

// ─────────────────────────────────────────────
// PUT — update transaction
// Reverts old balance effect, applies new one.
// userId is immutable (ownership never changes).
// ─────────────────────────────────────────────
const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }

  const db = getDb();

  // Load existing transaction to reverse its balance effect
  const existing = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!existing) {
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }

  const updatedDoc = {
    accountId: new ObjectId(data.accountId),
    categoryId: new ObjectId(data.categoryId),
    type: data.type,
    amount: Math.abs(Number(data.amount)),
    description: data.description.trim(),
    date: data.date ? new Date(data.date) : new Date(),
    paymentMethod: data.paymentMethod || 'other',
    notes: (data.notes || '').trim(),
    tags: cleanTags(data.tags),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatedDoc },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }

  // Reverse the old effect
  await applyBalanceDelta(
    existing.accountId,
    -signedAmount(existing.type, existing.amount)
  );

  // Apply the new effect
  await applyBalanceDelta(
    updatedDoc.accountId,
    signedAmount(updatedDoc.type, updatedDoc.amount)
  );

  return result;
};

// ─────────────────────────────────────────────
// DELETE — remove transaction
// Also reverses the balance effect on the linked account.
// ─────────────────────────────────────────────
const remove = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }

  const db = getDb();

  const existing = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!existing) {
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }

  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  // Reverse the balance effect
  await applyBalanceDelta(
    existing.accountId,
    -signedAmount(existing.type, existing.amount)
  );

  return result;
};

// ─────────────────────────────────────────────
// Lookup helpers (for future use)
// ─────────────────────────────────────────────

// All transactions for a user
const findByUserId = async (userId) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  const items = await db
    .collection(COLLECTION)
    .find({ userId: new ObjectId(userId) })
    .toArray();
  return Promise.all(items.map(enrich));
};

// All transactions for a specific account
const findByAccountId = async (accountId) => {
  if (!ObjectId.isValid(accountId)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }
  const db = getDb();
  const items = await db
    .collection(COLLECTION)
    .find({ accountId: new ObjectId(accountId) })
    .toArray();
  return Promise.all(items.map(enrich));
};

// All transactions for a specific category
const findByCategoryId = async (categoryId) => {
  if (!ObjectId.isValid(categoryId)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }
  const db = getDb();
  const items = await db
    .collection(COLLECTION)
    .find({ categoryId: new ObjectId(categoryId) })
    .toArray();
  return Promise.all(items.map(enrich));
};

// Transactions within a date range (for reports)
const findByDateRange = async (userId, startDate, endDate) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  const items = await db
    .collection(COLLECTION)
    .find({
      userId: new ObjectId(userId),
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    })
    .sort({ date: -1 })
    .toArray();
  return Promise.all(items.map(enrich));
};

// Sum income + expenses for a user (for dashboard/reports)
const getSummaryByUser = async (userId) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  const result = await db
    .collection(COLLECTION)
    .aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ])
    .toArray();

  const summary = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
  for (const row of result) {
    if (row._id === 'income') {
      summary.income = row.total;
      summary.incomeCount = row.count;
    } else if (row._id === 'expense') {
      summary.expense = row.total;
      summary.expenseCount = row.count;
    }
  }
  summary.netBalance = summary.income - summary.expense;
  return summary;
};

export {
  getAll,
  getById,
  create,
  update,
  remove,
  findByUserId,
  findByAccountId,
  findByCategoryId,
  findByDateRange,
  getSummaryByUser
};