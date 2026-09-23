import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'categories';

const getAll = async () => {
  const db = getDb();
  const items = await db.collection(COLLECTION).find().toArray();
  if (!items) throw new Error('No categories found');
  return items;
};

const getById = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }
  const db = getDb();
  const item = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!item) {
    throw Object.assign(new Error(`No category found with id ${id}`), { status: 404 });
  }
  return item;
};

const create = async (data) => {
  const db = getDb();
  const newCategory = {
    userId: data.userId ? new ObjectId(data.userId) : null,
    categoryName: data.categoryName,
    type: data.type,
    color: data.color || '#000000',
    icon: data.icon || 'default',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(newCategory);
  return { _id: result.insertedId, ...newCategory };
};

const update = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw Object.assign(new Error('Invalid category ID'), { status: 400 });
  }
  const db = getDb();
  const updatedDoc = {
    categoryName: data.categoryName,
    type: data.type,
    color: data.color || '#000000',
    icon: data.icon || 'default',
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
    throw Object.assign(new Error('Category not found'), { status: 404 });
  }
  return result;
};

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

export { getAll, getById, create, update, remove };