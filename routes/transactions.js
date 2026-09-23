import express from 'express';
import * as ctrl from '../controllers/transactions.js';

const router = express.Router();

router.get('/', ctrl.getAllTransactions);
router.get('/:id', ctrl.getTransactionById);
router.post('/', ctrl.createTransaction);
router.put('/:id', ctrl.updateTransaction);
router.delete('/:id', ctrl.deleteTransaction);

export default router;