describe('Docyra Platform Admin Portal E2E', () => {
  it('authenticates admin and manages clinics, applications and audit logs', () => {
    cy.visit('http://localhost:4200/login');

    // Login as Admin
    cy.get('input[name="email"]').type('admin@docyra.test');
    cy.get('input[name="password"]').type('AdminPassword123!');
    cy.get('button[type="submit"]').click();

    // Check Admin Dashboard
    cy.url().should('include', '/admin/dashboard');
    cy.contains('Platform Administration').should('be.visible');

    // Manage Clinics
    cy.visit('http://localhost:4200/admin/clinics');
    cy.contains('Partner Clinics Management').should('be.visible');

    // Doctor Applications
    cy.visit('http://localhost:4200/admin/doctor-applications');
    cy.contains('Independent Doctor Applications').should('be.visible');

    // Audit Logs
    cy.visit('http://localhost:4200/admin/audit-logs');
    cy.contains('Compliance & PHI Access Audit Trail').should('be.visible');
  });
});
