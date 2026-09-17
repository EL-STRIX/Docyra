describe('Docyra Patient Booking Flow E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/login');
  });

  it('allows a patient to login and book a clinic appointment', () => {
    // 1. Log in as patient
    cy.get('input[type="email"]').type('patient@docyra.test');
    cy.get('input[type="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();

    // 2. Navigate to Doctors discovery
    cy.visit('http://localhost:5173/doctors');
    cy.contains('Verified Doctors').should('be.visible');

    // 3. Select first doctor profile
    cy.get('.btn-book-primary').first().click();

    // 4. Booking Flow - Step 1: Slot Selection
    cy.contains('Select Appointment Date').should('be.visible');
    cy.get('.slot-button, button:contains("mins")').first().click();
    cy.contains('Continue to Patient Info').click();

    // 5. Step 2: Patient Selection (Self)
    cy.contains('Who is this appointment for?').should('be.visible');
    cy.contains('Continue to Reason').click();

    // 6. Step 3: Chief Complaint
    cy.get('textarea').type('Routine preventive health checkup and consultation.');
    cy.contains('Review & Confirm').click();

    // 7. Step 4: Verification & Agreement
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').last().check();
    cy.contains('Confirm & Book Appointment').click();

    // 8. Confirmation & ICS download check
    cy.contains('Booking Confirmed', { timeout: 10000 }).should('be.visible');
    cy.contains('Download .ics Calendar').should('be.visible');
  });
});
