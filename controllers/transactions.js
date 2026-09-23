import { ObjectId } from 'mongodb';
import * as Transaction from '../models/Transaction.js';
import * as Account from '../models/FinancialAccount.js';
import * as Category from '../models/Category.js';
import { getDb } from '../database/connect.js';

// ─────────────────────────────────────────────
// Allowed fields based on Swagger schema
// ─────────────────────────────────────────────
const ALLOWED_CREATE_FIELDS = [
  'userId',
  'accountId',
  'categoryId',
  'type',
  'amount',
  'description',
  'date',
  'paymentMethod',
  'notes',
  'tags'
];

const ALLOWED_UPDATE_FIELDS = [
  'accountId',
  'categoryId',
  'type',
  'amount',
  'description',
  'date',
  'paymentMethod',
  'notes',
  'tags'
];

const VALID_TYPES = ['income', 'expense'];
const VALID_PAYMENT_METHODS = ['cash', 'credit', 'debit', 'transfer', 'other'];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const findExtraFields = (body, allowed) =>
  Object.keys(body).filter((key) => !allowed.includes(key));

const isValidObjectId = (id) => ObjectId.isValid(id);

const isValidDate = (value) => {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
};

// Check that a user exists in the users collection
const userExists = async (userId) => {
  if (!isValidObjectId(userId)) return false;
  const db = getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  return !!user;
};

// Check that an account exists and belongs to the user
const accountBelongsToUser = async (accountId, userId) => {
  if (!isValidObjectId(accountId)) return false;
  const db = getDb();
  const account = await db.collection('financialaccounts').findOne({
    _id: new ObjectId(accountId),
    userId: new ObjectId(userId)
  });
  return !!account;
};

// Check that a category exists
const categoryExists = async (categoryId) => {
  if (!isValidObjectId(categoryId)) return false;
  const db = getDb();
  const category = await db.collection('categories').findOne({
    _id: new ObjectId(categoryId)
  });
  return !!category;
};

// ─────────────────────────────────────────────
// Shared field validation (used by POST + PUT)
// Returns { errors: [...] } or null if all good
// ─────────────────────────────────────────────
const validateTransactionFields = (body, { requireUserId }) => {
  const errors = [];
  const { userId, accountId, categoryId, type, amount, description, date, paymentMethod, notes, tags } = body;

  // Required: userId (only on POST)
  if (requireUserId) {
    if (!userId) {
      errors.push('userId is required');
    } else if (typeof userId !== 'string') {
      errors.push('userId must be a string');
    } else if (!isValidObjectId(userId)) {
      errors.push('userId must be a valid ObjectId');
    }
  }

  // Required: accountId
  if (!accountId) {
    errors.push('accountId is required');
  } else if (typeof accountId !== 'string') {
    errors.push('accountId must be a string');
  } else if (!isValidObjectId(accountId)) {
    errors.push('accountId must be a valid ObjectId');
  }

  // Required: categoryId
  if (!categoryId) {
    errors.push('categoryId is required');
  } else if (typeof categoryId !== 'string') {
    errors.push('categoryId must be a string');
  } else if (!isValidObjectId(categoryId)) {
    errors.push('categoryId must be a valid ObjectId');
  }

  // Required: type
  if (!type) {
    errors.push('type is required');
  } else if (typeof type !== 'string') {
    errors.push('type must be a string');
  } else if (!VALID_TYPES.includes(type)) {
    errors.push('type must be income or expense');
  }

  // Required: amount
  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (typeof amount !== 'number' || Number.isNaN(amount)) {
    errors.push('amount must be a number');
  } else if (amount <= 0) {
    errors.push('amount must be a positive number');
  } else if (amount > 1_000_000_000) {
    errors.push('amount is too large');
  }

  // Required: description
  if (!description) {
    errors.push('description is required');
  } else if (typeof description !== 'string') {
    errors.push('description must be a string');
  } else {
    const trimmed = description.trim();
    if (trimmed.length < 2) {
      errors.push('description must be at least 2 characters');
    }
    if (trimmed.length > 150) {
      errors.push('description must be 150 characters or fewer');
    }
  }

  // Optional: date
  if (date !== undefined) {
    if (!isValidDate(date)) {
      errors.push('date must be a valid ISO date string');
    }
  }

  // Optional: paymentMethod
  if (paymentMethod !== undefined) {
    if (typeof paymentMethod !== 'string') {
      errors.push('paymentMethod must be a string');
    } else if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      errors.push(
        `paymentMethod must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`
      );
    }
  }

  // Optional: notes
  if (notes !== undefined) {
    if (typeof notes !== 'string') {
      errors.push('notes must be a string');
    } else if (notes.length > 500) {
      errors.push('notes must be 500 characters or fewer');
    }
  }

  // Optional: tags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      errors.push('tags must be an array');
    } else if (tags.length > 20) {
      errors.push('tags must have 20 items or fewer');
    } else {
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          errors.push('every tag must be a string');
          break;
        }
        if (tag.trim().length === 0 || tag.trim().length > 30) {
          errors.push('every tag must be between 1 and 30 characters');
          break;
        }
      }
    }
  }

  return errors;
};

// ─────────────────────────────────────────────
// GET all transactions
// ─────────────────────────────────────────────
export const getAllTransactions = async (req, res, next) => {
  try {
    const txs = await Transaction.getAll();
    res.status(200).json(txs);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET one transaction
// ─────────────────────────────────────────────
export const getTransactionById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    const tx = await Transaction.getById(req.params.id);
    res.status(200).json(tx);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST — create transaction
// ─────────────────────────────────────────────
export const createTransaction = async (req, res, next) => {
  try {
    // 1. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_CREATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_CREATE_FIELDS
      });
    }

    // 2. Validate all fields
    const errors = validateTransactionFields(req.body, { requireUserId: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; '), errors });
    }

    // 3. Referential integrity — user must exist
    if (!(await userExists(req.body.userId))) {
      return res.status(400).json({ message: 'userId does not reference an existing user' });
    }

    // 4. Referential integrity — account must exist AND belong to user
    if (!(await accountBelongsToUser(req.body.accountId, req.body.userId))) {
      return res.status(400).json({
        message: 'accountId does not reference an existing account for this user'
      });
    }

    // 5. Referential integrity — category must exist
    if (!(await categoryExists(req.body.categoryId))) {
      return res.status(400).json({
        message: 'categoryId does not reference an existing category'
      });
    }

    // 6. Sanitize optional fields before handing to model
    const sanitized = {
      userId: req.body.userId,
      accountId: req.body.accountId,
      categoryId: req.body.categoryId,
      type: req.body.type,
      amount: req.body.amount,
      description: req.body.description.trim(),
      ...(req.body.date !== undefined && { date: req.body.date }),
      ...(req.body.paymentMethod !== undefined && { paymentMethod: req.body.paymentMethod }),
      ...(req.body.notes !== undefined && { notes: req.body.notes.trim() }),
      ...(req.body.tags !== undefined && { tags: req.body.tags })
    };

    const created = await Transaction.create(sanitized);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT — update transaction
// ─────────────────────────────────────────────
export const updateTransaction = async (req, res, next) => {
  try {
    // 1. Validate route param
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }

    // 2. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_UPDATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_UPDATE_FIELDS
      });
    }

    // 3. Validate all fields (userId not required on PUT)
    const errors = validateTransactionFields(req.body, { requireUserId: false });
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('; '), errors });
    }

    // 4. Load the existing transaction (needed for balance sync + ownership)
    const existing = await Transaction.getById(req.params.id);

    // 5. Referential integrity — account must exist AND belong to same user
    if (!(await accountBelongsToUser(req.body.accountId, existing.userId))) {
      return res.status(400).json({
        message: 'accountId does not reference an existing account for this user'
      });
    }

    // 6. Referential integrity — category must exist
    if (!(await categoryExists(req.body.categoryId))) {
      return res.status(400).json({
        message: 'categoryId does not reference an existing category'
      });
    }

    // 7. Sanitize
    const sanitized = {
      accountId: req.body.accountId,
      categoryId: req.body.categoryId,
      type: req.body.type,
      amount: req.body.amount,
      description: req.body.description.trim(),
      ...(req.body.date !== undefined && { date: req.body.date }),
      ...(req.body.paymentMethod !== undefined && { paymentMethod: req.body.paymentMethod }),
      ...(req.body.notes !== undefined && { notes: req.body.notes.trim() }),
      ...(req.body.tags !== undefined && { tags: req.body.tags })
    };

    const updated = await Transaction.update(req.params.id, sanitized);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export const deleteTransaction = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    await Transaction.remove(req.params.id);
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};