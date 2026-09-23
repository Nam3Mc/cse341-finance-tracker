import { ObjectId } from 'mongodb';
import * as Category from '../models/Category.js';

// ─────────────────────────────────────────────
// Allowed fields based on Swagger schema
// ─────────────────────────────────────────────
const ALLOWED_CREATE_FIELDS = [
  'userId',
  'categoryName',
  'type',
  'color',
  'icon'
];

const ALLOWED_UPDATE_FIELDS = [
  'categoryName',
  'type',
  'color',
  'icon'
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const findExtraFields = (body, allowed) =>
  Object.keys(body).filter((key) => !allowed.includes(key));

const isValidObjectId = (id) => ObjectId.isValid(id);

const isValidHexColor = (color) =>
  typeof color === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);

// ─────────────────────────────────────────────
// GET all
// ─────────────────────────────────────────────
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.getAll();
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// GET one
// ─────────────────────────────────────────────
export const getCategoryById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    const category = await Category.getById(req.params.id);
    res.status(200).json(category);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// POST — create category
// ─────────────────────────────────────────────
export const createCategory = async (req, res, next) => {
  try {
    const { userId, categoryName, type, color, icon } = req.body;

    // 1. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_CREATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_CREATE_FIELDS
      });
    }

    // 2. Required fields
    if (!userId || !categoryName || !type) {
      return res.status(400).json({
        message: 'userId, categoryName, and type are required'
      });
    }

    // 3. Type checks
    if (typeof userId !== 'string') {
      return res.status(400).json({ message: 'userId must be a string' });
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'userId must be a valid ObjectId' });
    }
    if (typeof categoryName !== 'string') {
      return res.status(400).json({ message: 'categoryName must be a string' });
    }
    if (typeof type !== 'string') {
      return res.status(400).json({ message: 'type must be a string' });
    }

    // 4. Length validation for categoryName
    const trimmedName = categoryName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: 'categoryName must be at least 2 characters'
      });
    }
    if (trimmedName.length > 50) {
      return res.status(400).json({
        message: 'categoryName must be 50 characters or fewer'
      });
    }

    // 5. Enum validation
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'type must be income or expense'
      });
    }

    // 6. Optional field validations
    if (color !== undefined) {
      if (!isValidHexColor(color)) {
        return res.status(400).json({
          message: 'color must be a valid hex code (e.g., #FF6B6B or #FFF)'
        });
      }
    }

    if (icon !== undefined) {
      if (typeof icon !== 'string') {
        return res.status(400).json({ message: 'icon must be a string' });
      }
      if (icon.trim().length === 0 || icon.trim().length > 50) {
        return res.status(400).json({
          message: 'icon must be between 1 and 50 characters'
        });
      }
    }

    // 7. Sanitize before insert
    const sanitized = {
      userId,
      categoryName: trimmedName,
      type,
      ...(color !== undefined && { color: color.toLowerCase() }),
      ...(icon !== undefined && { icon: icon.trim() })
    };

    const created = await Category.create(sanitized);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// PUT — update category
// ─────────────────────────────────────────────
export const updateCategory = async (req, res, next) => {
  try {
    // 1. Validate route param
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    const { categoryName, type, color, icon } = req.body;

    // 2. Reject unexpected fields
    const extraFields = findExtraFields(req.body, ALLOWED_UPDATE_FIELDS);
    if (extraFields.length > 0) {
      return res.status(400).json({
        message: `Unexpected field(s): ${extraFields.join(', ')}`,
        allowedFields: ALLOWED_UPDATE_FIELDS
      });
    }

    // 3. Required fields
    if (!categoryName || !type) {
      return res.status(400).json({
        message: 'categoryName and type are required'
      });
    }

    // 4. Type checks
    if (typeof categoryName !== 'string') {
      return res.status(400).json({ message: 'categoryName must be a string' });
    }
    if (typeof type !== 'string') {
      return res.status(400).json({ message: 'type must be a string' });
    }

    // 5. Length validation
    const trimmedName = categoryName.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({
        message: 'categoryName must be at least 2 characters'
      });
    }
    if (trimmedName.length > 50) {
      return res.status(400).json({
        message: 'categoryName must be 50 characters or fewer'
      });
    }

    // 6. Enum validation
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        message: 'type must be income or expense'
      });
    }

    // 7. Optional field validations
    if (color !== undefined) {
      if (!isValidHexColor(color)) {
        return res.status(400).json({
          message: 'color must be a valid hex code (e.g., #FF6B6B or #FFF)'
        });
      }
    }

    if (icon !== undefined) {
      if (typeof icon !== 'string') {
        return res.status(400).json({ message: 'icon must be a string' });
      }
      if (icon.trim().length === 0 || icon.trim().length > 50) {
        return res.status(400).json({
          message: 'icon must be between 1 and 50 characters'
        });
      }
    }

    // 8. Sanitize
    const sanitized = {
      categoryName: trimmedName,
      type,
      ...(color !== undefined && { color: color.toLowerCase() }),
      ...(icon !== undefined && { icon: icon.trim() })
    };

    const updated = await Category.update(req.params.id, sanitized);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export const deleteCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    await Category.remove(req.params.id);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};