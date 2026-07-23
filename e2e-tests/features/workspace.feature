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

  Scenario: Rename Workspace Folder
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                   | role |
      | user_rename@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                   | password       |
      | user_rename@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Old Name Vault"
    Then I should see the workspace folder named "Old Name Vault" in the sidebar
    When I rename the workspace folder "Old Name Vault" to "Renamed Vault"
    Then I should see the workspace folder named "Renamed Vault" in the sidebar

  Scenario: Delete Workspace Folder with Credentials Shows Warning, Empty Workspace Deletes
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                   | role |
      | user_delws@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                   | password       |
      | user_delws@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Protected Vault"
    And I select the workspace folder named "Protected Vault"
    When I create a secret named "Protected API Key" with template "api" and fields:
      | name       | value        | type      |
      | API Key    | api_key_1234 | plaintext |
      | API Secret | secret_val1  | secret    |
    And I click the submit secret button
    Then I should see a secret card for "Protected API Key"
    When I click delete for the workspace folder "Protected Vault"
    Then I should see the workspace deletion warning dialog
    When I delete the secret "Protected API Key"
    Then I should not see a secret card for "Protected API Key"
    When I click delete for the workspace folder "Protected Vault"
    And I confirm deletion of the workspace folder
