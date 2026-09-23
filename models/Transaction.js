import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'transactions';

// Manual "populate" — enrich with account + category names
const enrich = async (tx) => {
  const db = getDb();
  const [account, category] = await Promise.all([
    tx.accountId ? db.collection('financialaccounts').findOne({ _id: tx.accountId }) : null,
    tx.categoryId ? db.collection('categories').findOne({ _id: tx.categoryId }) : null
  ]);
  return {
    ...tx,
    account: account
      ? { _id: account._id, accountName: account.accountName, accountType: account.accountType }
      : null,
    category: category
      ? { _id: category._id, categoryName: category.categoryName, type: category.type }
      : null
  };
};

const getAll = async () => {
  const db = getDb();
  const items = await db.collection(COLLECTION).find().toArray();
  return Promise.all(items.map(enrich));
};

const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error(`No transaction found with id ${id}`), { status: 404 });
  }
  return enrich(item);
};

const create = async (data) => {
  const db = getDb();
  const newTx = {
    userId: new ObjectId(data.userId),
    accountId: new ObjectId(data.accountId),
    categoryId: new ObjectId(data.categoryId),
    type: data.type,
    amount: Number(data.amount),
    description: data.description,
    date: data.date ? new Date(data.date) : new Date(),
    paymentMethod: data.paymentMethod || 'other',
    notes: data.notes || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(newTx);
  return { _id: result.insertedId, ...newTx };
};

const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }
  const db = getDb();
  const updatedDoc = {
    accountId: new ObjectId(data.accountId),
    categoryId: new ObjectId(data.categoryId),
    type: data.type,
    amount: Number(data.amount),
    description: data.description,
    date: data.date ? new Date(data.date) : new Date(),
    paymentMethod: data.paymentMethod || 'other',
    notes: data.notes || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
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
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }
  return result;
};

const remove = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid transaction ID'), { status: 400 });
  }
  const db = getDb();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    throw Object.assign(new Error('Transaction not found'), { status: 404 });
  }
  return result;
};

export { getAll, getById, create, update, remove };