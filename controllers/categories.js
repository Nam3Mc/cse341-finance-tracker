import * as Category from '../models/Category.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.getAll();
    res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.getById(req.params.id);
    res.status(200).json(category);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { userId, categoryName, type } = req.body;

    if (!userId || !categoryName || !type) {
      return res.status(400).json({
        message: 'userId, categoryName, and type are required'
      });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'type must be income or expense' });
    }
    if (categoryName.length < 2) {
      return res.status(400).json({ message: 'categoryName must be at least 2 characters' });
    }

    const created = await Category.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { categoryName, type } = req.body;

    if (!categoryName || !type) {
      return res.status(400).json({ message: 'categoryName and type are required' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'type must be income or expense' });
    }

    const updated = await Category.update(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await Category.remove(req.params.id);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};