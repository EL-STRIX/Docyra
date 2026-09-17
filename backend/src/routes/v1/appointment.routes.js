const express = require('express');
const appointmentController = require('../../controllers/appointment.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');

const router = express.Router();

router.use(auth);

// Patient routes
router.post('/', requireRole(ROLES.PATIENT), appointmentController.bookAppointment);
router.get('/my', requireRole(ROLES.PATIENT), appointmentController.getMyPatientAppointments);

// Doctor appointments list
router.get('/doctor', requireRole(ROLES.DOCTOR), appointmentController.getDoctorAppointments);

// Single appointment & Calendar Export
router.get('/:id', appointmentController.getAppointmentById);
router.get('/:id/ics', appointmentController.exportIcs);

// Status updates & cancellation
router.patch('/:id/status', requireRole(ROLES.DOCTOR, ROLES.CLINIC_ADMIN, ROLES.ADMIN), appointmentController.updateStatus);
router.patch('/:id/cancel', requireRole(ROLES.PATIENT, ROLES.ADMIN), appointmentController.cancelAppointment);

module.exports = router;
