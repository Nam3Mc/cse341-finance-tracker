import express from 'express';
import usersRouter from './users.js'
import categoriesRouter from './categories.js';
import accountsRouter from './accounts.js';
import transactionsRouter from './transactions.js';

const router = express.Router();

router.use('/users', usersRouter);
router.use('/categories', categoriesRouter);
router.use('/accounts', accountsRouter);
router.use('/transactions', transactionsRouter);

export default router;