import { ObjectId } from 'mongodb';
import { getDb } from '../database/connect.js';

const COLLECTION = 'users';

export const getAllUsers = async (req, res, next) => {
  try {
    const db = getDb();
    const users = await db.collection(COLLECTION).find().toArray();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const db = getDb();
    const user = await db.collection(COLLECTION).findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { email, displayName, preferredCurrency, googleId } = req.body;

    // Validation
    if (!email || !displayName) {
      return res.status(400).json({
        message: 'email and displayName are required'
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'email must be a valid email address' });
    }
    if (displayName.length < 2) {
      return res.status(400).json({ message: 'displayName must be at least 2 characters' });
    }

    const db = getDb();

    // Check for duplicate email
    const existing = await db.collection(COLLECTION).findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const newUser = {
      googleId: googleId || null,
      email: email.toLowerCase(),
      displayName,
      preferredCurrency: preferredCurrency || 'USD',
      defaultAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTION).insertOne(newUser);
    res.status(201).json({ _id: result.insertedId, ...newUser });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { email, displayName, preferredCurrency } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ message: 'email and displayName are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'email must be a valid email address' });
    }
    if (displayName.length < 2) {
      return res.status(400).json({ message: 'displayName must be at least 2 characters' });
    }

    const db = getDb();
    const updatedDoc = {
      email: email.toLowerCase(),
      displayName,
      preferredCurrency: preferredCurrency || 'USD',
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedDoc },
      { returnDocument: 'after' }
    );

    if (!result) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const db = getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};