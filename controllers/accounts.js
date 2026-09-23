import * as Account from '../models/FinancialAccount.js';

export const getAllAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.getAll();
    res.status(200).json(accounts);
  } catch (err) {
    next(err);
  }
};

export const getAccountById = async (req, res, next) => {
  try {
    const account = await Account.getById(req.params.id);
    res.status(200).json(account);
  } catch (err) {
    next(err);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const { userId, accountName, accountType, initialBalance } = req.body;

    if (!userId || !accountName || !accountType) {
      return res.status(400).json({
        message: 'userId, accountName, and accountType are required'
      });
    }
    if (!['personal', 'business'].includes(accountType)) {
      return res.status(400).json({ message: 'accountType must be personal or business' });
    }
    if (initialBalance !== undefined && typeof initialBalance !== 'number') {
      return res.status(400).json({ message: 'initialBalance must be a number' });
    }

    const created = await Account.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const { accountName, accountType } = req.body;

    if (!accountName || !accountType) {
      return res.status(400).json({ message: 'accountName and accountType are required' });
    }
    if (!['personal', 'business'].includes(accountType)) {
      return res.status(400).json({ message: 'accountType must be personal or business' });
    }

    const updated = await Account.update(req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await Account.remove(req.params.id);
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};