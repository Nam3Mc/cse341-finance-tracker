import express from 'express';
import * as ctrl from '../controllers/categories.js';

const router = express.Router();

router.get('/', ctrl.getAllCategories);
router.get('/:id', ctrl.getCategoryById);
router.post('/', ctrl.createCategory);
router.put('/:id', ctrl.updateCategory);
router.delete('/:id', ctrl.deleteCategory);

export default router;