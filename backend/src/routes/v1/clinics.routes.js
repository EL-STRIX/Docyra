import express from 'express';
import { listClinics, getClinicDetail } from '../../controllers/clinic.controller.js';

const router = express.Router();

// Public: List active clinics & get clinic details with doctor roster
router.get('/', listClinics);
router.get('/:id', getClinicDetail);

export default router;
