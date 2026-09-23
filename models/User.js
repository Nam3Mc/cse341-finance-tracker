import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'users';

// ─────────────────────────────────────────────
// GET all users
// ─────────────────────────────────────────────
const getAll = async () => {
  const db = getDb();
  return db.collection(COLLECTION).find().toArray();
};

// ─────────────────────────────────────────────
// GET one user by ID
// ─────────────────────────────────────────────
const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }
  const db = getDb();
  const user = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return user;
};

// ─────────────────────────────────────────────
// POST — create user
// Only whitelisted fields are inserted.
// ─────────────────────────────────────────────
const create = async (data) => {
  const db = getDb();

  const newUser = {
    googleId: data.googleId ?? null,
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName.trim(),
    preferredCurrency: (data.preferredCurrency || 'USD').toUpperCase().trim(),
    defaultAccountId: data.defaultAccountId ? new ObjectId(data.defaultAccountId) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).insertOne(newUser);
  return { _id: result.insertedId, ...newUser };
};

// ─────────────────────────────────────────────
// PUT — update user
// Only whitelisted fields are updated.
// ─────────────────────────────────────────────
const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }

  const db = getDb();

  // Only pick fields the controller says are allowed to change
  const updatedDoc = {
    email: data.email.toLowerCase().trim(),
    displayName: data.displayName.trim(),
    preferredCurrency: (data.preferredCurrency || 'USD').toUpperCase().trim(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatedDoc },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return result;
};

// ─────────────────────────────────────────────
// DELETE — remove user
// ─────────────────────────────────────────────
const remove = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid user ID'), { status: 400 });
  }

  const db = getDb();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  return result;
};

export { getAll, getById, create, update, remove };