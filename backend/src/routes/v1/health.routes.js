import express from 'express';
import { getHealth, getPublicStats } from '../../controllers/health.controller.js';

const router = express.Router();

router.get('/', getHealth);
router.get('/stats', getPublicStats);

export default router;
