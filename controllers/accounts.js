import { ObjectId } from 'mongodb';
import * as Account from '../models/FinancialAccount.js';

// ─────────────────────────────────────────────
// Allowed fields based on Swagger schema
// ─────────────────────────────────────────────
const ALLOWED_CREATE_FIELDS = [
  'userId',
  'accountName',
  'accountType',
  'currency',
  'initialBalance',
  'description'
];

const ALLOWED_UPDATE_FIELDS = [
  'accountName',
  'accountType',
  'currency',
  'description',
  'isActive'
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const findExtraFields = (body, allowed) =>
  Object.keys(body).filter((key) => !allowed.includes(key));

const isValidObjectId = (id) => ObjectId.isValid(id);

// ─────────────────────────────────────────────
// GET all
// ─────────────────────────────────────────────
export const getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.getAll();
    res.status(200).json(accounts);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET one
// ─────────────────────────────────────────────
export const getAccountById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    const account = await Account.getById(req.params.id);
    res.status(200).json(account);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST — create account
// ─────────────────────────────────────────────
export const createAccount = async (req, res, next) => {
  try {
    const {
      userId,
      accountName,
      accountType,
      currency,
      initialBalance,
      description
    } = req.body;

    // 1. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_CREATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_CREATE_FIELDS
      });
    }

    // 2. Required fields
    if (!userId || !accountName || !accountType) {
      return res.status(400).json({
        message: 'userId, accountName, and accountType are required'
      });
    }

    // 3. Type checks
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId must be a string' });
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'userId must be a valid ObjectId' });
    }
    if (typeof accountName !== 'string') {
      return res.status(400).json({ message: 'accountName must be a string' });
    }
    if (accountName.trim().length < 2 || accountName.trim().length > 60) {
      return res.status(400).json({
        message: 'accountName must be between 2 and 60 characters'
      });
    }
    if (typeof accountType !== 'string') {
      return res.status(400).json({ message: 'accountType must be a string' });
    }

    // 4. Enum validation
    if (!['personal', 'business'].includes(accountType)) {
      return res.status(400).json({
        message: 'accountType must be personal or business'
      });
    }

    // 5. Optional field validations
    if (currency !== undefined) {
      if (typeof currency !== 'string') {
        return res.status(400).json({ message: 'currency must be a string' });
      }
      if (currency.trim().length !== 3) {
        return res.status(400).json({
          message: 'currency must be a 3-letter code (e.g., USD, EUR)'
        });
      }
    }

    if (initialBalance !== undefined) {
      if (typeof initialBalance !== 'number' || Number.isNaN(initialBalance)) {
        return res.status(400).json({ message: 'initialBalance must be a number' });
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ message: 'description must be a string' });
      }
      if (description.length > 250) {
        return res.status(400).json({
          message: 'description must be 250 characters or fewer'
        });
      }
    }

    // 6. Sanitize before insert (trim strings)
    const sanitized = {
      userId,
      accountName: accountName.trim(),
      accountType,
      ...(currency !== undefined && { currency: currency.toUpperCase().trim() }),
      ...(initialBalance !== undefined && { initialBalance }),
      ...(description !== undefined && { description: description.trim() })
    };

    const created = await Account.create(sanitized);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT — update account
// ─────────────────────────────────────────────
export const updateAccount = async (req, res, next) => {
  try {
    // 1. Validate route param
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }

    const { accountName, accountType, currency, description, isActive } = req.body;

    // 2. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_UPDATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_UPDATE_FIELDS
      });
    }

    // 3. Required fields
    if (!accountName || !accountType) {
      return res.status(400).json({
        message: 'accountName and accountType are required'
      });
    }

    // 4. Type + length checks
    if (typeof accountName !== 'string') {
      return res.status(400).json({ message: 'accountName must be a string' });
    }
    if (accountName.trim().length < 2 || accountName.trim().length > 60) {
      return res.status(400).json({
        message: 'accountName must be between 2 and 60 characters'
      });
    }
    if (typeof accountType !== 'string') {
      return res.status(400).json({ message: 'accountType must be a string' });
    }

    // 5. Enum validation
    if (!['personal', 'business'].includes(accountType)) {
      return res.status(400).json({
        message: 'accountType must be personal or business'
      });
    }

    // 6. Optional field validations
    if (currency !== undefined) {
      if (typeof currency !== 'string' || currency.trim().length !== 3) {
        return res.status(400).json({
          message: 'currency must be a 3-letter code (e.g., USD, EUR)'
        });
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ message: 'description must be a string' });
      }
      if (description.length > 250) {
        return res.status(400).json({
          message: 'description must be 250 characters or fewer'
        });
      }
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    // 7. Sanitize
    const sanitized = {
      accountName: accountName.trim(),
      accountType,
      ...(currency !== undefined && { currency: currency.toUpperCase().trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(isActive !== undefined && { isActive })
    };

    const updated = await Account.update(req.params.id, sanitized);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export const deleteAccount = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    await Account.remove(req.params.id);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};