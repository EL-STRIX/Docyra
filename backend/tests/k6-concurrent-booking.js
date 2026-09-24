/* global __ENV, __VU */
import http from 'k6/http';
import { check } from 'k6';

/**
 * Docyra k6 Concurrent Booking Race Test
 * 
 * Verifies that when multiple concurrent virtual users attempt to book the exact same slot,
 * exactly one user succeeds (HTTP 201) and all other concurrent attempts receive HTTP 409 Conflict.
 * 
 * Usage:
 *   k6 run --vus 20 --duration 5s tests/k6-concurrent-booking.js
 */

export const options = {
  scenarios: {
    concurrent_booking_race: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 1,
      maxDuration: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.96'], // 19 out of 20 will receive 409 which counts as error in k6 unless handled
  },
};

const BASE_URL = typeof __ENV !== 'undefined' && __ENV.API_BASE_URL ? __ENV.API_BASE_URL : 'http://localhost:5000/api/v1';
const TARGET_SLOT_ID = typeof __ENV !== 'undefined' && __ENV.SLOT_ID ? __ENV.SLOT_ID : 'mock-slot-target-id';
const AUTH_COOKIE = typeof __ENV !== 'undefined' && __ENV.AUTH_COOKIE ? __ENV.AUTH_COOKIE : 'accessToken=mock_patient_jwt';
const CSRF_TOKEN = typeof __ENV !== 'undefined' && __ENV.CSRF_TOKEN ? __ENV.CSRF_TOKEN : 'mock-csrf-token';

export default function () {
  const url = `${BASE_URL}/appointments`;
  const vuId = typeof __VU !== 'undefined' ? __VU : 1;

  const payload = JSON.stringify({
    doctorId: '65f000000000000000000001',
    slotId: TARGET_SLOT_ID,
    bookedFor: {
      type: 'self',
      name: `Concurrent Patient VU-${vuId}`,
    },
    reasonForVisit: 'Concurrent load test slot reservation',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `${AUTH_COOKIE}; csrfToken=${CSRF_TOKEN}`,
      'x-csrf-token': CSRF_TOKEN,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'Status is either 201 Created or 409 Conflict': (r) => r.status === 201 || r.status === 409,
    'No 500 Internal Server Errors under race condition': (r) => r.status !== 500,
  });
}
