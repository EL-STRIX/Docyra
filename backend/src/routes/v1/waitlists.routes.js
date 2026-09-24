import express from 'express';
import {
  joinWaitlist,
  claimWaitlistSlot,
  getMyWaitlists,
  cancelWaitlist,
} from '../../controllers/waitlist.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  joinWaitlistSchema,
  claimWaitlistSchema,
} from '../../validators/waitlist.validator.js';
import { ROLES } from '../../config/constants.js';

const router = express.Router();

// Waitlist operations require Patient role
router.use(authenticate, requireRole(ROLES.PATIENT));

router.post('/', validate(joinWaitlistSchema), joinWaitlist);
router.post('/claim', validate(claimWaitlistSchema), claimWaitlistSlot);
router.get('/my', getMyWaitlists);
router.delete('/:id', cancelWaitlist);

export default router;
