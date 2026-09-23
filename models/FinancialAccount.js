import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'financialaccounts';

const getAll = async () => {
  const db = getDb();
  return db.collection(COLLECTION).find().toArray();
};

const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error(`No account found with id ${id}`), { status: 404 });
  }
  return item;
};

const create = async (data) => {
  const db = getDb();
  const initial = typeof data.initialBalance === 'number' ? data.initialBalance : 0;
  const newAccount = {
    userId: data.userId ? new ObjectId(data.userId) : null,
    accountName: data.accountName,
    accountType: data.accountType,
    currency: data.currency || 'USD',
    initialBalance: initial,
    currentBalance: initial,
    description: data.description || '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(newAccount);
  return { _id: result.insertedId, ...newAccount };
};

const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid account ID'), { status: 400 });
  }
  const db = getDb();
  const updatedDoc = {
    accountName: data.accountName,
    accountType: data.accountType,
    currency: data.currency || 'USD',
    description: data.description || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    updatedAt: new Date()
  };
  const result = await db
    .collection(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updatedDoc },
      { returnDocument: 'after' }
    );

  if (!result) {
    throw Object.assign(new Error('Account not found'), { status: 404 });
  }
  return result;
};

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

export { getAll, getById, create, update, remove };