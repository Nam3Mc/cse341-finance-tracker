import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'financialaccounts';

// ─────────────────────────────────────────────
// GET all accounts
// ─────────────────────────────────────────────
const getAll = async () => {
  const db = getDb();
  return db.collection(COLLECTION).find().toArray();
};

// ─────────────────────────────────────────────
// GET one account by ID
// ─────────────────────────────────────────────
const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }
  return item;
};

// ─────────────────────────────────────────────
// POST — create account
// Only whitelisted fields are inserted.
// userId is converted to ObjectId (guaranteed by controller).
// ─────────────────────────────────────────────
const create = async (data) => {
  const db = getDb();

  const initial =
    typeof data.initialBalance === 'number' ? data.initialBalance : 0;

  const newAccount = {
    userId: new ObjectId(data.userId),
    accountName: data.accountName.trim(),
    accountType: data.accountType,
    currency: (data.currency || 'USD').toUpperCase().trim(),
    initialBalance: initial,
    currentBalance: initial,
    description: (data.description || '').trim(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).insertOne(newAccount);
  return { _id: result.insertedId, ...newAccount };
};

// ─────────────────────────────────────────────
// PUT — update account
// Only whitelisted fields are updated.
// userId and initialBalance are immutable.
// currentBalance is NOT touched here (updated by transactions).
// Optional fields are only updated when provided.
// ─────────────────────────────────────────────
const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }

  const db = getDb();

  // Always-updated fields (required by Swagger on PUT)
  const updatedDoc = {
    accountName: data.accountName.trim(),
    accountType: data.accountType,
    updatedAt: new Date()
  };

  // Optional fields — only touch if provided
  if (data.currency !== undefined) {
    updatedDoc.currency = data.currency.toUpperCase().trim();
  }
  if (data.description !== undefined) {
    updatedDoc.description = data.description.trim();
  }
  if (data.isActive !== undefined) {
    updatedDoc.isActive = data.isActive;
  }

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatedDoc },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }
  return result;
};

// ─────────────────────────────────────────────
// DELETE — remove account
// ─────────────────────────────────────────────
const remove = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }

  const db = getDb();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }
  return result;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Find all accounts belonging to a specific user
const findByUserId = async (userId) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  return db.collection(COLLECTION).find({ userId: new ObjectId(userId) }).toArray();
};

// Find accounts by user + type (e.g., all "business" accounts for a user)
const findByUserAndType = async (userId, accountType) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  return db
    .collection(COLLECTION)
    .find({ userId: new ObjectId(userId), accountType })
    .toArray();
};

// Check duplicate account name per user (useful for validation)
const findByUserAndName = async (userId, accountName) => {
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  return db.collection(COLLECTION).findOne({
    userId: new ObjectId(userId),
    accountName: accountName.trim()
  });
};

// Adjust current balance (used by transaction logic later)
const adjustBalance = async (id, delta) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }
  const db = getDb();
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $inc: { currentBalance: delta },
      $set: { updatedAt: new Date() }
    },
    { returnDocument: 'after' }
  );
  if (!result) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }
  return result;
};

export {
  getAll,
  getById,
  create,
  update,
  remove,
  findByUserId,
  findByUserAndType,
  findByUserAndName,
  adjustBalance
};