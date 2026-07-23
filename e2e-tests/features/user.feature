Feature: User Account and Data Deletion

  Scenario: Delete User Account and All Associated Data
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                   | role |
      | user_delacc@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                   | password       |
      | user_delacc@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I request user account and data deletion
    Then I should be redirected back to the login page
