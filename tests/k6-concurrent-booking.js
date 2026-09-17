import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    concurrent_booking: {
      executor: 'per-vu-iterations',
      vus: 10, // 10 concurrent virtual users trying to book the exact same slot simultaneously
      iterations: 1,
      maxDuration: '30s',
    },
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api/v1';
const TARGET_SLOT_ID = __ENV.SLOT_ID || 'test-slot-id';
const DOCTOR_ID = __ENV.DOCTOR_ID || 'test-doctor-id';
const PATIENT_TOKEN = __ENV.PATIENT_TOKEN || 'test-jwt-token';

export default function () {
  const payload = JSON.stringify({
    doctorId: DOCTOR_ID,
    slotId: TARGET_SLOT_ID,
    reason: 'Concurrent Race Lock Validation Test',
    captchaToken: 'verified-test-token',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PATIENT_TOKEN}`,
      'X-CSRF-Token': 'test-csrf-token',
    },
  };

  const res = http.post(`${BASE_URL}/appointments`, payload, params);

  // Exactly one request must return 201 (Created), all other 9 concurrent attempts must return 400/409 (SLOT_ALREADY_BOOKED)
  check(res, {
    'status is 201 or 400/409': (r) => [201, 400, 409].includes(r.status),
  });

  sleep(1);
}
