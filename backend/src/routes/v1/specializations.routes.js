import express from 'express';
import { listSpecializations, getSpecialization } from '../../controllers/specialization.controller.js';

const router = express.Router();

// Public: List all specializations
router.get('/', listSpecializations);
router.get('/:id', getSpecialization);

export default router;
