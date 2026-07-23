Feature: Workspace Folder Management
  As an authenticated user
  I want to create, list, rename, and safely delete workspace folders
  To organize my secrets

  Background:
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |

  Scenario: Creating a workspace folder successfully
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    When I request workspace creation with name "Development API Keys"
    Then the response status code should be 201
    And the workspace name in response should be "Development API Keys"

  Scenario: Creating workspace folder fails if name is empty
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    When I request workspace creation with name "    "
    Then the response status code should be 400

  Scenario: Unauthenticated request fails to create workspace
    When I request workspace creation with name "Unauthorized Folder" without login
    Then the response status code should be 401

  Scenario: Renaming an existing workspace folder successfully
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Old Name Vault"
    When I rename the active workspace to "New Name Vault"
    Then the response status code should be 200
    And the workspace name in response should be "New Name Vault"

  Scenario: Deleting a workspace containing credentials fails
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Busy Workspace"
    And I store secret details:
      | name       | value              | iv         |
      | API Token  | EncryptedBytes==   | IVBytes==  |
    When I request deletion of the active workspace
    Then the response status code should be 400

  Scenario: Deleting an empty workspace succeeds
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    And I create a workspace named "Empty Workspace"
    When I request deletion of the active workspace
    Then the response status code should be 200
