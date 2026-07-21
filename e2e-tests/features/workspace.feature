Feature: Workspace Directory Folder Management

  Scenario: Create and Select Workspace Folder
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                 | role |
      | user_ws@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                 | password       |
      | user_ws@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Frontend Secrets Store"
    Then I should see the workspace folder named "Frontend Secrets Store" in the sidebar
    When I select the workspace folder named "Frontend Secrets Store"
