Feature: Zero-Knowledge Secret Management
  As an authenticated user
  I want to store client-encrypted secrets in my workspace
  So that they remain secure and private

  Scenario: Storing and listing secrets in owned workspace successfully
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Production Secrets"
    When I store secret details:
      | name       | value              | iv         |
      | Stripe Key | CiphertextString== | IVString== |
    Then the response status code should be 201
    And I should be able to list secrets and see "Stripe Key"

  Scenario: Storing secret in workspace owned by another user fails
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Production Secrets"
    And I logout
    And I login with credentials:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I attempt to store a secret named "Malicious Secret" in the user's workspace
    Then the response status code should be 403

  Scenario: Listing secrets of another user's workspace is forbidden
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
    When I attempt to list secrets from the user's workspace
    Then the response status code should be 403
