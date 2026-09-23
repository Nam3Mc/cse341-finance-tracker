import express from 'express';
import * as ctrl from '../controllers/accounts.js';

const router = express.Router();

router.get('/', ctrl.getAllAccounts);
router.get('/:id', ctrl.getAccountById);
router.post('/', ctrl.createAccount);
router.put('/:id', ctrl.updateAccount);
router.delete('/:id', ctrl.deleteAccount);

export default router;