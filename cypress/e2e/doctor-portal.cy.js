describe('Docyra Doctor Portal E2E', () => {
  it('authenticates doctor and allows schedule & emergency management', () => {
    cy.visit('http://localhost:4200/login');

    // Login as Doctor
    cy.get('input[name="email"]').type('doctor@docyra.test');
    cy.get('input[name="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();

    // Check Doctor Dashboard
    cy.url().should('include', '/doctor/dashboard');
    cy.contains("Today's Patient Consultations").should('be.visible');

    // Availability Rules
    cy.visit('http://localhost:4200/doctor/availability');
    cy.contains('Weekly Availability Rules').should('be.visible');
    cy.get('button.btn-save').click();
    cy.contains('Availability rules updated successfully').should('be.visible');

    // Emergency Protocol
    cy.visit('http://localhost:4200/doctor/emergency');
    cy.contains('Doctor Emergency Unavailability').should('be.visible');
  });
});
