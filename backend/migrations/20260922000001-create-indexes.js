export const up = async (db, client) => {
  // Users collection indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });
  await db.collection('users').createIndex({ clinicId: 1 });
  await db.collection('users').createIndex({ status: 1 });

  // Clinics collection indexes
  await db.collection('clinics').createIndex({ name: 1 }, { unique: true });
  await db.collection('clinics').createIndex({ subscriptionStatus: 1 });
  await db.collection('clinics').createIndex({ city: 1 });

  // Specializations collection indexes
  await db.collection('specializations').createIndex({ name: 1 }, { unique: true });

  // Doctor Profiles collection indexes
  await db.collection('doctorprofiles').createIndex({ userId: 1 }, { unique: true });
  await db.collection('doctorprofiles').createIndex({ clinicId: 1 });
  await db.collection('doctorprofiles').createIndex({ specializationId: 1 });
  await db.collection('doctorprofiles').createIndex({ isApproved: 1 });

  // Availability Rules collection indexes
  await db.collection('availabilityrules').createIndex({ doctorId: 1, dayOfWeek: 1 });
  await db.collection('availabilityrules').createIndex({ doctorId: 1, isActive: 1 });

  // Appointment Slots - CRITICAL UNIQUE COMPOUND INDEX
  await db.collection('appointmentslots').createIndex(
    { doctorId: 1, slotStart: 1, slotEnd: 1 },
    { unique: true }
  );
  await db.collection('appointmentslots').createIndex({ doctorId: 1, isBooked: 1, slotStart: 1 });

  // Appointments collection indexes
  await db.collection('appointments').createIndex({ slotId: 1 }, { unique: true });
  await db.collection('appointments').createIndex({ patientId: 1, status: 1 });
  await db.collection('appointments').createIndex({ doctorId: 1, slotStart: 1 });
  await db.collection('appointments').createIndex({ clinicId: 1 });
  await db.collection('appointments').createIndex({ status: 1 });

  // Dependents collection indexes
  await db.collection('dependents').createIndex({ patientId: 1 });

  // Reviews collection indexes
  await db.collection('reviews').createIndex({ appointmentId: 1 }, { unique: true });
  await db.collection('reviews').createIndex({ doctorId: 1, status: 1 });
  await db.collection('reviews').createIndex({ patientId: 1 });

  // Waitlists collection indexes
  await db.collection('waitlists').createIndex({ doctorId: 1, desiredDateRangeStart: 1, status: 1 });
  await db.collection('waitlists').createIndex({ patientId: 1, doctorId: 1, status: 1 });

  // Audit Logs collection indexes
  await db.collection('auditlogs').createIndex({ actorId: 1, timestamp: -1 });
  await db.collection('auditlogs').createIndex({ resourceType: 1, resourceId: 1 });
  await db.collection('auditlogs').createIndex({ timestamp: -1 });
  await db.collection('auditlogs').createIndex({ action: 1 });
};

export const down = async (db, client) => {
  await db.collection('users').dropIndexes();
  await db.collection('clinics').dropIndexes();
  await db.collection('specializations').dropIndexes();
  await db.collection('doctorprofiles').dropIndexes();
  await db.collection('availabilityrules').dropIndexes();
  await db.collection('appointmentslots').dropIndexes();
  await db.collection('appointments').dropIndexes();
  await db.collection('dependents').dropIndexes();
  await db.collection('reviews').dropIndexes();
  await db.collection('waitlists').dropIndexes();
  await db.collection('auditlogs').dropIndexes();
};
