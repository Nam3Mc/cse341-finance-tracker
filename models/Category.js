import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'categories';

// ─────────────────────────────────────────────
// GET all categories
// ─────────────────────────────────────────────
const getAll = async () => {
  const db = getDb();
  return db.collection(COLLECTION).find().toArray();
};

// ─────────────────────────────────────────────
// GET one category by ID
// ─────────────────────────────────────────────
const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return item;
};

// ─────────────────────────────────────────────
// POST — create category
// Only whitelisted fields are inserted.
// ─────────────────────────────────────────────
const create = async (data) => {
  const db = getDb();

  const newCategory = {
    userId: new ObjectId(data.userId),
    categoryName: data.categoryName.trim(),
    type: data.type,
    color: (data.color || '#000000').toLowerCase().trim(),
    icon: (data.icon || 'default').trim(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).insertOne(newCategory);
  return { _id: result.insertedId, ...newCategory };
};

// ─────────────────────────────────────────────
// PUT — update category
// Only whitelisted fields are updated.
// userId is immutable (ownership never changes).
// ─────────────────────────────────────────────
const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }

  const db = getDb();

  const updatedDoc = {
    categoryName: data.categoryName.trim(),
    type: data.type,
    color: (data.color || '#000000').toLowerCase().trim(),
    icon: (data.icon || 'default').trim(),
    updatedAt: new Date()
  };

  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updatedDoc },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return result;
};

// ─────────────────────────────────────────────
// DELETE — remove category
// ─────────────────────────────────────────────
const remove = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }

  const db = getDb();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return result;
};

// ─────────────────────────────────────────────
// Helper for future validation (e.g., duplicate names per user)
// ─────────────────────────────────────────────
const findByUserAndName = async (userId, categoryName) => {
  const db = getDb();
  return db.collection(COLLECTION).findOne({
    userId: new ObjectId(userId),
    categoryName: categoryName.trim()
  });
};

export { getAll, getById, create, update, remove, findByUserAndName };