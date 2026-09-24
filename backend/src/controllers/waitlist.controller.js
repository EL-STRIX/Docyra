import { waitlistService } from '../services/waitlistService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Patient: Join doctor waitlist
 */
export const joinWaitlist = asyncHandler(async (req, res) => {
  const { doctorId, desiredDateRangeStart, desiredDateRangeEnd } = req.body;

  const entry = await waitlistService.joinWaitlist({
    patientId: req.user.id,
    doctorId,
    desiredDateRangeStart,
    desiredDateRangeEnd,
  });

  res.status(201).json({
    success: true,
    message: 'Added to doctor waitlist successfully',
    data: entry,
  });
});

/**
 * Patient: Claim notified waitlist slot
 */
export const claimWaitlistSlot = asyncHandler(async (req, res) => {
  const { waitlistId, slotId, reasonForVisit, notes, captchaToken } = req.body;

  const appointment = await waitlistService.claimSlot(
    {
      waitlistId,
      slotId,
      reasonForVisit,
      notes,
      captchaToken,
    },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'Waitlist slot claimed and booked successfully',
    data: appointment,
  });
});

/**
 * Patient: List my waitlist entries
 */
export const getMyWaitlists = asyncHandler(async (req, res) => {
  const entries = await waitlistService.getMyWaitlists(req.user.id);

  res.status(200).json({
    success: true,
    data: entries,
  });
});

/**
 * Patient: Cancel waitlist entry
 */
export const cancelWaitlist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cancelledEntry = await waitlistService.cancelWaitlist(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Waitlist entry cancelled successfully',
    data: cancelledEntry,
  });
});

export default {
  joinWaitlist,
  claimWaitlistSlot,
  getMyWaitlists,
  cancelWaitlist,
};
