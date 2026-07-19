Feature: Administrative Operations
  As a System Admin
  I want to create user accounts and view metrics
  To manage the vault workspace access

  Scenario: Admin successfully creates standard user account
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And I login with credentials:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I create user account:
      | email               | role |
      | operator@test.local | user |
    Then the response status code should be 201
    And the user temporary password should be returned

  Scenario: Non-admin fails to fetch database statistics
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    When I request database statistics
    Then the response status code should be 403

  Scenario: Admin successfully views database statistics reflecting metrics
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Production Secrets"
    And I store secret details:
      | name       | value              | iv         |
      | Stripe Key | CiphertextString== | IVString== |
    And I logout
    And I login with credentials:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I request database statistics
    Then the response status code should be 200
    And the statistics metrics should contain:
      | email                | secret_count |
      | developer@test.local | 1            |
