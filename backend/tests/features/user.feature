Feature: User Account and Data Deletion
  As an authenticated user
  I want to permanently delete my account and all associated workspace data
  So that no data remains when I close my account

  Background:
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |

  Scenario: Standard user deletes account and all associated data successfully
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "User Personal Vault"
    And I store secret details:
      | name            | value              | iv         |
      | Personal Secret | CiphertextString== | IVString== |
    When I request account deletion
    Then the response status code should be 200

  Scenario: Admin account deletion is forbidden
    And I login with credentials:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I request account deletion
    Then the response status code should be 403
