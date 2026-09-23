import * as Transaction from '../models/Transaction.js';

export const getAllTransactions = async (req, res, next) => {
  try {
    const txs = await Transaction.getAll();
    res.status(200).json(txs);
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const tx = await Transaction.getById(req.params.id);
    res.status(200).json(tx);
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const { userId, accountId, categoryId, type, amount, description, paymentMethod } = req.body;

    if (!userId || !accountId || !categoryId || !type || !amount || !description) {
      return res.status(400).json({
        message: 'userId, accountId, categoryId, type, amount, and description are required'
      });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'type must be income or expense' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }
    if (
      paymentMethod &&
      !['cash', 'credit', 'debit', 'transfer', 'other'].includes(paymentMethod)
    ) {
      return res.status(400).json({ message: 'Invalid paymentMethod' });
    }

    const created = await Transaction.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, description } = req.body;

    if (!accountId || !categoryId || !type || !amount || !description) {
      return res.status(400).json({
        message: 'accountId, categoryId, type, amount, and description are required'
      });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'type must be income or expense' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number' });
    }

    const updated = await Transaction.update(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    await Transaction.remove(req.params.id);
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};