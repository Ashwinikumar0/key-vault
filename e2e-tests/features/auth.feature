Feature: User Authentication

  Scenario: Admin Login with Default Credentials
    Given I navigate to the login page
    When I log in with credentials:
      | email               | password         |
      | admin@keyvault.local| adminpassword123 |
    Then I should be redirected to the dashboard

  Scenario: Login with Mismatched Credentials
    Given I navigate to the login page
    When I log in with credentials:
      | email               | password         |
      | admin@keyvault.local| wrongpassword    |
    Then I should see a login error message containing "invalid email or password"

  Scenario: User Logout
    Given I navigate to the login page
    When I log in with credentials:
      | email               | password         |
      | admin@keyvault.local| adminpassword123 |
    Then I should be redirected to the dashboard
    When I click the logout button
    Then I should be redirected back to the login page
