import express from 'express';
import usersRouter from './users.js';
import categoriesRouter from './categories.js';
import accountsRouter from './accounts.js';
import transactionsRouter from './transactions.js';
import ensureAuthenticated from '../middleware/oauth.js';

const router = express.Router();

router.use('/users', ensureAuthenticated, usersRouter);
router.use('/categories', ensureAuthenticated, categoriesRouter);
router.use('/accounts', ensureAuthenticated, accountsRouter);
router.use('/transactions', ensureAuthenticated, transactionsRouter);

export default router;