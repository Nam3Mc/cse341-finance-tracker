import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'users';

const getAll = async () => {
  const db = getDb();
  return db.collection(COLLECTION).find().toArray();
};

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

const create = async (data) => {
  const db = getDb();
  const newUser = {
    googleId: data.googleId || null,
    email: data.email,
    displayName: data.displayName,
    preferredCurrency: data.preferredCurrency || 'USD',
    defaultAccountId: data.defaultAccountId ? new ObjectId(data.defaultAccountId) : null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(newUser);
  return { _id: result.insertedId, ...newUser };
};

export { getAll, getById, create };