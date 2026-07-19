Feature: Authentication and Session Management
  As a User of the KeyVault API
  I want to log in, verify my active session, and log out
  To protect my secure vault access

  Scenario: Logging in successfully with correct credentials
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I login with credentials:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    Then the response status code should be 200
    And the session cookie "token" should be set

  Scenario: Logging in fails with incorrect password
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I login with credentials:
      | email            | password      |
      | admin@test.local | wrongpassword |
    Then the response status code should be 401
    And the session cookie "token" should not be set

  Scenario: Fetching me session profile unauthenticated fails
    Given a clean test database with seeded admin:
      | email            | password         |
      | admin@test.local | adminpassword123 |
    When I request session profile without login
    Then the response status code should be 401
