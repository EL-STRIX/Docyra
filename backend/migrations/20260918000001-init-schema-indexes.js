module.exports = {
  async up(db) {
    // 1. Users Indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ clinicId: 1 });

    // 2. Clinics Indexes
    await db.collection('clinics').createIndex({ name: 1 }, { unique: true });
    await db.collection('clinics').createIndex({ subscriptionStatus: 1 });
    await db.collection('clinics').createIndex({ city: 1 });

    // 3. Specializations Indexes
    await db.collection('specializations').createIndex({ name: 1 }, { unique: true });

    // 4. Doctor Profiles Indexes
    await db.collection('doctorprofiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('doctorprofiles').createIndex({ clinicId: 1 });
    await db.collection('doctorprofiles').createIndex({ specializationId: 1 });
    await db.collection('doctorprofiles').createIndex({ isApproved: 1 });

    // 5. Availability Rules Indexes
    await db.collection('availabilityrules').createIndex({ doctorId: 1, dayOfWeek: 1 });

    // 6. Appointment Slots Indexes (CRITICAL UNIQUE COMPOUND INDEX)
    await db.collection('appointmentslots').createIndex(
      { doctorId: 1, slotStart: 1, slotEnd: 1 },
      { unique: true }
    );
    await db.collection('appointmentslots').createIndex({ doctorId: 1, isBooked: 1, slotStart: 1 });

    // 7. Appointments Indexes
    await db.collection('appointments').createIndex({ patientId: 1, status: 1 });
    await db.collection('appointments').createIndex({ doctorId: 1, slotStart: 1 });
    await db.collection('appointments').createIndex({ clinicId: 1, slotStart: 1 });
    await db.collection('appointments').createIndex({ slotId: 1 }, { unique: true });

    // 8. Dependents Indexes
    await db.collection('dependents').createIndex({ patientId: 1, name: 1 });

    // 9. Reviews Indexes
    await db.collection('reviews').createIndex({ appointmentId: 1 }, { unique: true });
    await db.collection('reviews').createIndex({ doctorId: 1, status: 1 });

    // 10. Waitlist Indexes
    await db.collection('waitlists').createIndex({ doctorId: 1, desiredDateRangeStart: 1, status: 1 });

    // 11. Audit Logs Indexes
    await db.collection('auditlogs').createIndex({ actorId: 1, timestamp: -1 });
    await db.collection('auditlogs').createIndex({ action: 1, timestamp: -1 });
  },

  async down(db) {
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
  }
};
