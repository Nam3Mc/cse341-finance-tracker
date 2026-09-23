import { ObjectId } from 'mongodb';
import * as User from '../models/User.js';

// ─────────────────────────────────────────────
// Allowed fields based on Swagger schema
// ─────────────────────────────────────────────
const ALLOWED_CREATE_FIELDS = [
  'email',
  'displayName',
  'preferredCurrency',
  'googleId'
];

const ALLOWED_UPDATE_FIELDS = [
  'email',
  'displayName',
  'preferredCurrency'
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const findExtraFields = (body, allowed) =>
  Object.keys(body).filter((key) => !allowed.includes(key));

const isValidObjectId = (id) => ObjectId.isValid(id);

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidCurrency = (currency) =>
  typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency);

// ─────────────────────────────────────────────
// GET all users
// ─────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.getAll();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET one user
// ─────────────────────────────────────────────
export const getUserById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const user = await User.getById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST — create user
// ─────────────────────────────────────────────
export const createUser = async (req, res, next) => {
  try {
    const { email, displayName, preferredCurrency, googleId } = req.body;

    // 1. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_CREATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_CREATE_FIELDS
      });
    }

    // 2. Required fields
    if (!email || !displayName) {
      return res.status(400).json({
        message: 'email and displayName are required'
      });
    }

    // 3. Type checks
    if (typeof email !== 'string') {
      return res.status(400).json({ message: 'email must be a string' });
    }
    if (typeof displayName !== 'string') {
      return res.status(400).json({ message: 'displayName must be a string' });
    }

    // 4. Email format
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({
        message: 'email must be a valid email address'
      });
    }

    // 5. displayName length
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: 'displayName must be at least 2 characters'
      });
    }
    if (trimmedName.length > 60) {
      return res.status(400).json({
        message: 'displayName must be 60 characters or fewer'
      });
    }

    // 6. Optional: preferredCurrency
    if (preferredCurrency !== undefined) {
      if (!isValidCurrency(preferredCurrency)) {
        return res.status(400).json({
          message: 'preferredCurrency must be a 3-letter code (e.g., USD, EUR)'
        });
      }
    }

    // 7. Optional: googleId
    if (googleId !== undefined) {
      if (typeof googleId !== 'string' || googleId.trim().length === 0) {
        return res.status(400).json({
          message: 'googleId must be a non-empty string'
        });
      }
    }

    // 8. Duplicate email check
    const existing = await User.findByEmail(trimmedEmail);
    if (existing) {
      return res.status(400).json({
        message: 'A user with this email already exists'
      });
    }

    // 9. Sanitize
    const sanitized = {
      email: trimmedEmail,
      displayName: trimmedName,
      ...(preferredCurrency !== undefined && {
        preferredCurrency: preferredCurrency.toUpperCase().trim()
      }),
      ...(googleId !== undefined && { googleId: googleId.trim() })
    };

    const created = await User.create(sanitized);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT — update user
// ─────────────────────────────────────────────
export const updateUser = async (req, res, next) => {
  try {
    // 1. Validate route param
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { email, displayName, preferredCurrency } = req.body;

    // 2. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_UPDATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_UPDATE_FIELDS
      });
    }

    // 3. Required fields
    if (!email || !displayName) {
      return res.status(400).json({
        message: 'email and displayName are required'
      });
    }

    // 4. Type checks
    if (typeof email !== 'string') {
      return res.status(400).json({ message: 'email must be a string' });
    }
    if (typeof displayName !== 'string') {
      return res.status(400).json({ message: 'displayName must be a string' });
    }

    // 5. Email format
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return res.status(400).json({
        message: 'email must be a valid email address'
      });
    }

    // 6. displayName length
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: 'displayName must be at least 2 characters'
      });
    }
    if (trimmedName.length > 60) {
      return res.status(400).json({
        message: 'displayName must be 60 characters or fewer'
      });
    }

    // 7. Optional: preferredCurrency
    if (preferredCurrency !== undefined) {
      if (!isValidCurrency(preferredCurrency)) {
        return res.status(400).json({
          message: 'preferredCurrency must be a 3-letter code (e.g., USD, EUR)'
        });
      }
    }

    // 8. Duplicate email check (excluding this user)
    const existing = await User.findByEmail(trimmedEmail);
    if (existing && existing._id.toString() !== req.params.id) {
      return res.status(400).json({
        message: 'A user with this email already exists'
      });
    }

    // 9. Sanitize
    const sanitized = {
      email: trimmedEmail,
      displayName: trimmedName,
      ...(preferredCurrency !== undefined && {
        preferredCurrency: preferredCurrency.toUpperCase().trim()
      })
    };

    const updated = await User.update(req.params.id, sanitized);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    await User.remove(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};