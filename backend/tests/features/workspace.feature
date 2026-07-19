Feature: Workspace Folder Management
  As an authenticated user
  I want to create and list workspace folders
  To organize my secrets

  Scenario: Creating a workspace folder successfully
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    When I request workspace creation with name "Development API Keys"
    Then the response status code should be 201
    And the workspace name in response should be "Development API Keys"

  Scenario: Creating workspace folder fails if name is empty
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    And an authenticated user "developer@test.local" is created by admin
    And I login as "developer@test.local"
    When I request workspace creation with name "    "
    Then the response status code should be 400

  Scenario: Unauthenticated request fails to create workspace
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I request workspace creation with name "Unauthorized Folder" without login
    Then the response status code should be 401
