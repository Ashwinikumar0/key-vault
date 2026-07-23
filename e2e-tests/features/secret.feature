Feature: Zero-Knowledge Custom Secrets Management

  Scenario: Create Zero-Knowledge Login Credentials with Eye Icon Toggling
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                  | role |
      | user_sec1@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                  | password       |
      | user_sec1@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Product Launch API Keys"
    And I select the workspace folder named "Product Launch API Keys"
    When I create a secret named "Stripe Gateway Accounts" with template "login" and fields:
      | name        | value                 | type      |
      | Username    | stripe_user_admin     | plaintext |
      | Password    | supersecretpassphrase | secret    |
      | Website URL | https://stripe.com    | plaintext |
    And I toggle the password visibility for field at index 1
    Then the field value at index 1 should be visible as text
    And I toggle the password visibility for field at index 1
    Then the field value at index 1 should be masked
    And I click the submit secret button
    Then I should see a secret card for "Stripe Gateway Accounts"
    When I click the decrypt button on the card for "Stripe Gateway Accounts"
    Then I should see the decrypted field values for "Stripe Gateway Accounts":
      | name        | value                 |
      | Username    | stripe_user_admin     |
      | Password    | supersecretpassphrase |
      | Website URL | https://stripe.com    |

  Scenario: Edit and Delete Secret Credentials
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                  | role |
      | user_editsec@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                  | password       |
      | user_editsec@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Dev Ops Keys"
    And I select the workspace folder named "Dev Ops Keys"
    When I create a secret named "Old API Key" with template "api" and fields:
      | name       | value        | type      |
      | API Key    | api_key_1234 | plaintext |
      | API Secret | secret_val1  | secret    |
    And I click the submit secret button
    Then I should see a secret card for "Old API Key"
    When I edit secret "Old API Key" to new title "Updated Production Key"
    Then I should see a secret card for "Updated Production Key"
    When I delete the secret "Updated Production Key"
    Then I should not see a secret card for "Updated Production Key"

  Scenario: JSON Template Downloads, Decrypted Exports, and Client-Side Imports
    Given I navigate to the login page
    When I log in with credentials:
      | email                | password         |
      | admin@keyvault.local | adminpassword123 |
    Then I should be redirected to the dashboard
    When I create a user account with details:
      | email                  | role |
      | user_sec2@keyvault.local| user |
    And I record the temporary password generated
    When I click the logout button
    Then I should be redirected back to the login page
    When I log in with credentials:
      | email                  | password       |
      | user_sec2@keyvault.local| <tempPassword> |
    Then I should be redirected to the dashboard
    When I create a workspace folder named "Database Backup Cluster"
    And I select the workspace folder named "Database Backup Cluster"
    When I create a secret named "Stripe Gateway Accounts" with template "login" and fields:
      | name        | value                 | type      |
      | Username    | stripe_user_admin     | plaintext |
      | Password    | supersecretpassphrase | secret    |
      | Website URL | https://stripe.com    | plaintext |
    And I click the submit secret button
    Then I should see a secret card for "Stripe Gateway Accounts"
    When I click the export JSON button
    Then the downloaded JSON file should contain secrets matching:
      | name                    | itemType | value                 |
      | Stripe Gateway Accounts | login    | supersecretpassphrase |
    When I click the download template button
    Then the downloaded template file should be a valid sample JSON format
    When I import secrets from the JSON template with modifications:
      | name               | itemType | username | password             |
      | Slack Notification | api      | slackbot | webhook_token_abc123 |
    Then I should see an alert dialog containing "Successfully imported 1 secrets"
    And I should see a secret card for "Slack Notification"
