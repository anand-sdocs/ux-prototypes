# Salesforce Settings Configuration Design Specification

This document details the architecture, data schema, and implementation strategy for transitioning S-Docs configuration settings from a relational database design (with `master_global_settings` and `customer_settings` tables) into a Salesforce-native solution. 

---

## 1. Overview & Architectural Shift

In a standard multi-tenant relational database, separate tables (`master_global_settings` and `customer_settings`) are required to isolate tenant overrides from the global application defaults.

In Salesforce, **every Org is already a tenant**. Therefore, the configuration does not need to distinguish between global master settings and customer-specific settings. A single Salesforce configuration store holds the default configuration for that specific Org (packaged as custom metadata defaults) and allows administrators to modify them.

### Key Architectural Decisions:
1. **Custom Metadata Type (`Configuration__mdt`)**: Used as the primary storage mechanism. CMT records are natively deployable, packageable, and cached for high performance.
2. **Granularity**: Storing **one record per individual setting** (matching the rows of the original CSV settings) rather than one record containing a massive JSON block. This ensures that:
   - Setting definitions, data types, and override controls are self-documenting and natively searchable within Salesforce.
   - Individual settings can be updated without the risk of hitting the Custom Metadata limit (32,768 characters for Long Text Areas).
3. **DeveloperName Mapping**: The standard `DeveloperName` field of `Configuration__mdt` will map directly to the `Setting_Name__c` to ensure readability and compliance with the 40-character DeveloperName limit.
4. **Dynamic JSON Construction**: Apex will query these individual metadata records, dynamically deserialize their raw JSON values (`Value__c`), and assemble them into a nested map structure matching the required schema for client consumption.

---

## 2. Salesforce Schema Design

We will create a Custom Metadata Type with the Developer Name `Configuration` (API Name: `Configuration__mdt`).

### Custom Fields on `Configuration__mdt`

| Field API Name | Data Type | Length | Description |
| :--- | :--- | :--- | :--- |
| `Category__c` | Text | 255 | Top-level setting grouping (e.g., `account`, `templates`, `signatureRequest`, `styles`). |
| `Sub_Category__c` | Text | 255 | Sub-category grouping / UI section (e.g., `basicInfo`, `pageSettings`, `tables`). |
| `Setting_Name__c` | Text | 255 | API identifier of the setting (e.g., `pageSize`, `tableBorder`). |
| `Value__c` | Long Text Area | 32768 | Stringified JSON representation of the setting value (e.g. `true`, `"US Letter"`, or `{"top": 0.5, ...}`). |
| `Data_Type__c` | Text | 50 | The expected type of the data: `String`, `JSON`, `Integer`, `StringList`, `Boolean`, or `Double`. |
| `Allow_Override__c` | Checkbox | — | If checked (`true`), indicates this setting can be overridden at the template, envelope (esignature), or document level. |

---

## 3. Data Mapping & Default Records

Below is the mapping from the source relational database defaults (derived from the `global_settings.csv` file) to the Salesforce `Configuration__mdt` records.

### Record Naming Conventions
- **DeveloperName**: Must match the `Setting_Name__c` directly. In rare cases where duplicates exist across different categories, prefix the DeveloperName with `Category_` (e.g. `templates_pageSize`).
- **Label**: Matches the `Setting_Name__c` but can be formatted for readability.

### Mapped Configuration Records

| DeveloperName (Setting Name) | Category | Sub-Category (Section Name) | Data Type | Default Value (`Value__c`) | Allow Override |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **organizationName** | account | basicInfo | String | `"S-Docs"` | False |
| **accountWebsite** | account | basicInfo | String | `"https://www.sdocs.com/"` | False |
| **primaryAddress** | account | basicInfo | JSON | `{"city": "New York City", "state": "NY", "country": "USA", "postalCode": "10175", "streetAddress1": "521 Fifth Ave"}` | False |
| **primaryContact** | account | contacts | String | `""` | False |
| **complianceContact** | account | contacts | String | `""` | False |
| **notificationContacts** | account | contacts | StringList | `""` | False |
| **automationUser** | account | automation | String | `""` | False |
| **accountSessionExpiry** | account | session | Integer | `60` | False |
| **pageSize** | templates | pageSettings | String | `"US Letter"` | True |
| **pageOrientation** | templates | pageSettings | String | `"portrait"` | True |
| **pageMargins** | templates | pageSettings | JSON | `{"top": 0.5, "left": 0.5, "right": 0.5, "bottom": 0.5}` | True |
| **documentFileNameFormat** | templates | fileName | JSON | `""` | True |
| **templateHeader** | templates | headerFooter | JSON | `{"allowEditing": true, "isDisplayHeader": false}` | True |
| **templateFooter** | templates | headerFooter | JSON | `{"allowEditing": true, "isDisplayFooter": false}` | True |
| **templateAddToObjectRecord** | templates | attachments | Boolean | `true` | True |
| **templateAddToObjectTimeline** | templates | attachments | JSON | `{"addToObjectTimeline": false}` | True |
| **isSignatureOtpRequired** | signatureRequest | pin | Boolean | `true` | True |
| **signatureSessionExpiry** | signatureRequest | expirySettings | Integer | `60` | True |
| **envelopeExpiry** | signatureRequest | expirySettings | Integer | `30` | True |
| **redirectUrlOnSignature** | signatureRequest | redirection | String | `"https://www.sdocs.com"` | False |
| **redirectUrlOnSignatureError**| signatureRequest | redirection | String | `"https://www.sdocs.com"` | False |
| **senderName** | signatureRequest | messageCustomization | String | `"S-Docs"` | False |
| **initialRequestEmail** | signatureRequest | messageCustomization | JSON | *See Note [1]* | True |
| **voidedEmail** | signatureRequest | messageCustomization | JSON | *See Note [2]* | False |
| **completedEmail** | signatureRequest | messageCustomization | JSON | *See Note [3]* | False |
| **firstReminder** | signatureRequest | messageCustomization | JSON | *See Note [4]* | False |
| **expiryReminder** | signatureRequest | messageCustomization | JSON | *See Note [5]* | False |
| **documentAccess** | signatureRequest | messageCustomization | JSON | *See Note [6]* | False |
| **documentOtp** | signatureRequest | messageCustomization | JSON | *See Note [7]* | False |
| **signatureOtp** | signatureRequest | messageCustomization | JSON | *See Note [8]* | False |
| **workflowErrorEmail** | signatureRequest | messageCustomization | JSON | *See Note [9]* | False |
| **emailFooter** | signatureRequest | messageCustomization | JSON | *See Note [10]* | False |
| **userAccess** | signatureRequest | messageCustomization | JSON | *See Note [11]* | False |
| **signatureElectronicDisclosure**| signatureRequest| disclosure | JSON | *See Note [12]* | False |
| **auditTrail** | signatureRequest | recordAssociation | String | `"end"` | True |
| **showTimestampAndSignerName** | signatureRequest | recordAssociation | Boolean | `false` | True |
| **attachSignedDocument** | signatureRequest | recordAssociation | Boolean | `true` | True |
| **addSignedObjectToTimeline** | signatureRequest | recordAssociation | JSON | `{"addToObjectTimeline": false}` | True |
| **signatureFontStyle** | signatureRequest | signature | JSON | `{"fontSize": "10", "fontFamily": "Arial"}` | True |
| **defaultLogo** | styles | logo | JSON | `""` | False |
| **listsPadding** | styles | lists | JSON | `{"top": 5, "left": 25, "right": 0.5, "bottom": 5}` | True |
| **tableCellPadding** | styles | tables | Double | `8.0` | True |
| **tableCellSpacing** | styles | tables | Double | `0` | True |
| **tableBorder** | styles | tables | JSON | `{"color": "#DBDBE2", "style": "solid", "weight": "1"}` | True |
| **tableRowColor** | styles | tables | String | `"#FFFFFF"` | True |
| **tableAlternateRowColor** | styles | tables | String | `"#FFFFFF"` | True |
| **showTableHeader** | styles | tables | Boolean | `true` | True |
| **tableHeaderFontStyle** | styles | tables | JSON | `{"fontSize": "10", "fontColor": "#000000", "fontFamily": "Arial", "fontWeight": "700", "lineHeight": "1"}` | True |
| **tableHeaderBackgroundColor** | styles | tables | String | `"#FFFFFF"` | True |
| **tableFontStyle** | styles | tables | JSON | `{"fontSize": "10", "fontColor": "#000000", "fontFamily": "Arial", "fontWeight": "400", "lineHeight": "2"}` | True |
| **textFontStyle** | styles | text | JSON | `{"fontSize": "10", "fontColor": "#000000", "fontFamily": "Arial", "fontWeight": "400", "lineHeight": "1.5"}` | True |
| **workflowDocumentEmail** | signatureRequest | messageCustomization | JSON | *See Note [13]* | False |
| **envelopeDocumentRequest** | signatureRequest | messageCustomization | JSON | *See Note [14]* | False |

---

### JSON Values Detail Notes

> [!NOTE]
> Values containing HTML or complex structures are displayed below to preserve escaping rules.

* **[1] initialRequestEmail**:
  ```json
  {"message": "<p class=\"paragraph\"> Dear <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_FIRST_NAME\" label=\"RECIPIENT_FIRST_NAME\" datatype=\"string\">RECIPIENT_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_LAST_NAME\" label=\"RECIPIENT_LAST_NAME\" datatype=\"string\">RECIPIENT_LAST_NAME</objectdata></p><p class=\"paragraph\"> This is a friendly reminder that your documents are ready to be signed. To complete the e-signature process, please follow the steps below: </p><ol><li>Click the Sign Now button below</li><li>Review the document(s) carefully</li><li>Click on signature fields to add your electronic signature</li><li>Submit once all required signature inputs are complete</li></ol><p class=\"paragraph\"> This signature request will expire in <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"EXPIRY_DAYS\" label=\"EXPIRY_DAYS\" datatype=\"number\">EXPIRY_DAYS</objectdata></p><p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"E_SIGN_LINK\" label=\"E_SIGN_LINK\" datatype=\"url\">E_SIGN_LINK</objectdata></p><p class=\"paragraph\"> Regards, </p><p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_FIRST_NAME\" label=\"SENDER_FIRST_NAME\" datatype=\"string\">SENDER_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_LAST_NAME\" label=\"SENDER_LAST_NAME\" datatype=\"string\">SENDER_LAST_NAME</objectdata></p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "You Have a New Document to Sign"}]}}
  ```
* **[2] voidedEmail**:
  ```json
  {"message": "<p class=\"paragraph\"> Dear <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_FIRST_NAME\" label=\"RECIPIENT_FIRST_NAME\" datatype=\"string\">RECIPIENT_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_LAST_NAME\" label=\"RECIPIENT_LAST_NAME\" datatype=\"string\">RECIPIENT_LAST_NAME</objectdata>, </p><p class=\"paragraph\"> The e-signature request : <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"ENVELOPE_NAME\" label=\"ENVELOPE_NAME\" datatype=\"string\">ENVELOPE_NAME</objectdata> has been voided. </p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Envelope has been voided"}]}}
  ```
* **[3] completedEmail**:
  ```json
  {"message": "<p class=\"paragraph\">Dear <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_FIRST_NAME\" label=\"RECIPIENT_FIRST_NAME\" datatype=\"string\">RECIPIENT_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_LAST_NAME\" label=\"RECIPIENT_LAST_NAME\" datatype=\"string\">RECIPIENT_LAST_NAME</objectdata>, </p><p class=\"paragraph\"> The e-signature process is completed, please find the document in the attachment: </p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "E-Signature Successfully Completed"}]}}
  ```
* **[4] firstReminder**:
  ```json
  {"message": "<p>Dear ${RECIPIENT_NAME},</p><p>This is a friendly reminder that your documents are ready to be signed. To complete the e-signature process, please follow the steps below:</p><ol><li>Click the <strong>Sign Now</strong> button below</li><li>Review the document(s) carefully</li><li>Click on signature fields to add your electronic signature</li><li>Submit once all required signature inputs are complete</li></ol><p>This signature request will expire in ${EXPIRY_DAYS} days.</p><a href=\"${E_SIGN_LINK}\" class=\"button\">Sign Now</a>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Signature Reminder Email"}]}}
  ```
* **[5] expiryReminder**:
  ```json
  {"message": "<p>Dear ${RECIPIENT_NAME},</p><p>This is a gentle reminder that your documents are ready to be signed and the link you received will expire soon.</p><ol><li>Click the <strong>Sign Now</strong> button below</li><li>Review the document(s) carefully</li><li>Click on signature fields to add your electronic signature</li><li>Submit once all required signature inputs are complete</li></ol><p>This signature request will expire in ${EXPIRY_DAYS} days.</p><a href=\"${E_SIGN_LINK}\" class=\"button\">Sign Now</a>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Signature Expiry Reminder Email"}]}}
  ```
* **[6] documentAccess**:
  ```json
  {"message": "<h2>Hello,</h2><p>You have been invited to review a document. Please click the button below to access the document:</p><a href=\"${DOCUMENT_LINK}\" class=\"button\">Document link</a><p>Thank you!</p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "S-Docs : Invitation for document review"}]}}
  ```
* **[7] documentOtp**:
  ```json
  {"message": "<p>Dear ${RECIPIENT_PLACEHOLDER},</p><p class=\"center-text\"><span class=\"inline-text\">Your Verification code for Document invite verification is ${OTP_PLACEHOLDER}</span></p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Verification code for Document Invite"}]}}
  ```
* **[8] signatureOtp**:
  ```json
  {"message": "<p>Dear ${RECIPIENT_PLACEHOLDER},</p><p class=\"center-text\"><span class=\"inline-text\">Your Verification code for Signature Verification ${OTP_PLACEHOLDER}.</span></p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Your verification code for identity confirmation"}]}}
  ```
* **[9] workflowErrorEmail**:
  ```json
  {"message": "<p>Dear ${RECIPIENT_FIRST_NAME} ${RECIPIENT_LAST_NAME},</p><p>The following request has failed processing:</p><ul><li><strong>S-Docs Reference Id:</strong> ${REFERENCE_ID}</li><li><strong>Request Type:</strong> ${REQUEST_TYPE}</li><li><strong>Created Date & Time:</strong> ${CREATED_DATE}</li><li><strong>Status:</strong> FAILED</li><li><strong>Hubspot Portal ID:</strong> ${HUB_ID}</li><li><strong>Hubspot Object:</strong> ${ORIGIN_OBJECT}</li><li><strong>Workflow Enrollment ID:</strong> ${ENROLLMENT_ID}</li></ul><p>Please review the details and take necessary action.</p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "S-Docs - Error processing Request"}]}}
  ```
* **[10] emailFooter**:
  ```json
  {"message": "<p>S-DOCS Team</p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Footer for email"}]}}
  ```
* **[11] userAccess**:
  ```json
  {"message": "<h2>Hello,</h2><p>You have been invited to S-Docs.Please contact your administrator</p><p>Thank you!</p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "S-Docs : Invitation"}]}}
  ```
* **[12] signatureElectronicDisclosure**:
  ```json
  {"message": "The information provided in this document is for general informational purposes only and does not constitute legal, financial, or professional advice. While every effort has been made to ensure the accuracy and reliability of the content, no guarantees are made regarding its completeness or applicability to your specific situation.", "optionalUrl": "https://www.sdocs.com/"}
  ```
* **[13] workflowDocumentEmail**:
  ```json
  {"message": "<p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"COMPANY_LOGO\" label=\"COMPANY_LOGO\" datatype=\"image\">COMPANY_LOGO</objectdata> </p><p class=\"paragraph\"> Dear <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_FIRST_NAME\" label=\"RECIPIENT_FIRST_NAME\" datatype=\"string\">RECIPIENT_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"RECIPIENT_LAST_NAME\" label=\"RECIPIENT_LAST_NAME\" datatype=\"string\">RECIPIENT_LAST_NAME</objectdata>, </p><p class=\"paragraph\"> Attached is <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"TEMPLATE_NAME\" label=\"TEMPLATE_NAME\" datatype=\"string\">TEMPLATE_NAME</objectdata> document for your reference. </p><p class=\"paragraph\"> Thanks, </p><p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_FIRST_NAME\" label=\"SENDER_FIRST_NAME\" datatype=\"string\">SENDER_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_LAST_NAME\" label=\"SENDER_LAST_NAME\" datatype=\"string\">SENDER_LAST_NAME</objectdata> </p><p class=\"paragraph\"> Email: <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"EMAIL\" label=\"EMAIL\" datatype=\"string\">EMAIL</objectdata> </p><p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"COMPANY_NAME\" label=\"COMPANY_NAME\" datatype=\"string\">COMPANY_NAME</objectdata> </p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "Document you requested"}]}}
  ```
* **[14] envelopeDocumentRequest**:
  ```json
  {"message": "<p class=\"paragraph\"> Attached is the document that you requested. </p><p class=\"paragraph\"> Regards, </p><p class=\"paragraph\"><objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_FIRST_NAME\" label=\"SENDER_FIRST_NAME\" datatype=\"string\">SENDER_FIRST_NAME</objectdata> <objectdata class=\"mention_tool_at\" contenteditable=\"false\" dataelementid=\"SENDER_LAST_NAME\" label=\"SENDER_LAST_NAME\" datatype=\"string\">SENDER_LAST_NAME</objectdata></p>", "subject": {"type": "expression", "parts": [{"type": "static", "value": "You have a new document attached"}]}}
  ```

---

## 4. Apex Implementation Design

To support settings retrieval and persistence from the Lightning Web Component, we design an Apex utility class `ConfigurationService`.

### 4.1 Retrieval Engine & JSON Serialization

The following code queries individual Custom Metadata Type records, parses each value as its correct JSON object type using `JSON.deserializeUntyped()`, and reconstructs the nested schema.

```java
public with sharing class ConfigurationService {

    /**
     * Retrieves all configurations and compiles them into a nested map structure.
     * Guaranteed to output all fields with default values/nulls to maintain schema consistency.
     * @return Map<String, Object> The overall nested settings structure.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getOverallSettings() {
        Map<String, Object> overallSettings = new Map<String, Object>();
        
        // 1. Query all Configuration records
        List<Configuration__mdt> records = [
            SELECT DeveloperName, Category__c, Sub_Category__c, Setting_Name__c, Value__c, Data_Type__c
            FROM Configuration__mdt
        ];

        // 2. Group records by Category
        for (Configuration__mdt record : records) {
            String category = record.Category__c;
            String settingName = record.Setting_Name__c;
            String rawJson = record.Value__c;

            // Ensure the category maps are instantiated
            if (!overallSettings.containsKey(category)) {
                overallSettings.put(category, new Map<String, Object>());
            }
            Map<String, Object> categoryMap = (Map<String, Object>) overallSettings.get(category);

            // Deserialize individual setting's value
            Object parsedValue = null;
            if (String.isNotBlank(rawJson)) {
                try {
                    // JSON.deserializeUntyped naturally resolves strings, booleans, decimals, and objects
                    parsedValue = JSON.deserializeUntyped(rawJson);
                } catch (Exception ex) {
                    System.debug(LoggingLevel.ERROR, 'Failed to deserialize setting ' + settingName + ': ' + ex.getMessage());
                    parsedValue = rawJson; // Fallback to raw string in case of malformed JSON
                }
            }

            categoryMap.put(settingName, parsedValue);
        }

        return overallSettings;
    }
    
    /**
     * Serializes overall settings map back into a top-level string JSON format.
     */
    @AuraEnabled(cacheable=true)
    public static String getOverallSettingsJson() {
        return JSON.serializePretty(getOverallSettings());
    }
}
```

---

### 4.2 Updating Custom Metadata from LWC

Since standard Apex DML cannot write directly to Custom Metadata Types, updates from the LWC are deployed asynchronously using Salesforce's `Metadata.Operations.enqueueDeployment` namespace.

```java
public with sharing class ConfigurationService {

    /**
     * Queues an asynchronous metadata deployment to update settings.
     * @param settingsToUpdate A Map of Setting Name (DeveloperName) to new JSON Value String.
     */
    @AuraEnabled
    public static void saveSettings(Map<String, String> settingsToUpdate) {
        Metadata.DeployContainer mdContainer = new Metadata.DeployContainer();
        
        // Query to get existing records for Label compatibility
        Map<String, Configuration__mdt> existingRecordsMap = new Map<String, Configuration__mdt>();
        for (Configuration__mdt record : [
            SELECT DeveloperName, MasterLabel 
            FROM Configuration__mdt 
            WHERE DeveloperName IN :settingsToUpdate.keySet()
        ]) {
            existingRecordsMap.put(record.DeveloperName, record);
        }

        for (String settingName : settingsToUpdate.keySet()) {
            String newJsonValue = settingsToUpdate.get(settingName);

            // Construct Custom Metadata record instance
            Metadata.CustomMetadata customMetadata = new Metadata.CustomMetadata();
            customMetadata.fullName = 'Configuration.' + settingName;
            
            // Retrieve or generate label
            if (existingRecordsMap.containsKey(settingName)) {
                customMetadata.label = existingRecordsMap.get(settingName).MasterLabel;
            } else {
                customMetadata.label = settingName; // Fallback
            }

            // Assign the Value__c field
            Metadata.CustomMetadataValue customField = new Metadata.CustomMetadataValue();
            customField.field = 'Value__c';
            customField.value = newJsonValue;
            customMetadata.values.add(customField);

            mdContainer.addMetadata(customMetadata);
        }

        // Enqueue deployment (requires appropriate user permissions)
        if (!Test.isRunningTest()) {
            Id deployJobId = Metadata.Operations.enqueueDeployment(mdContainer, new DeployCallback());
            System.debug('Enqueued metadata deployment job ID: ' + deployJobId);
        }
    }

    /**
     * Deployment Callback class to handle success and error logging
     */
    private class DeployCallback implements Metadata.DeployCallback {
        public void handleResult(Metadata.DeployResult result, Metadata.DeployCallbackContext context) {
            if (result.status == Metadata.DeployStatus.Succeeded) {
                System.debug('Configuration deployment succeeded.');
            } else {
                System.debug('Configuration deployment failed: ' + result.errorMessage);
            }
        }
    }
}
```

---

## 5. Record-Level Settings Overrides (Template, Envelope, and Document Levels)

Rather than storing user-level overrides, configuration settings in S-Docs are overridden at the document template, signature request, and generated document levels. This is achieved by adding a custom field `Override_Settings__c` (Long Text Area) on the three key S-Docs objects:

1. **`SDTemplate__c`**: Represents a document template. Overrides here primarily affect the `templates` category settings (e.g. `pageSize`, `pageOrientation`).
2. **`Envelope__c`**: Represents an e-signature request. Overrides here primarily affect the `signatureRequest` category settings (e.g. `isSignatureOtpRequired`).
3. **`SDoc__c`**: Represents a generated document. Overrides here primarily affect the `styles` category settings (e.g. `tableRowColor`, `textFontStyle`).

### 5.1 Override JSON Structure Examples

Each record stores a JSON string in its `Override_Settings__c` field containing overrides for the corresponding setting category.

#### `SDTemplate__c` (Overrides `templates` category)
```json
{
  "pageSize": "A4",
  "pageOrientation": "landscape",
  "pageMargins": {
    "top": 1.0,
    "left": 1.0,
    "right": 1.0,
    "bottom": 1.0
  }
}
```

#### `Envelope__c` (Overrides `signatureRequest` category)
```json
{
  "isSignatureOtpRequired": false,
  "envelopeExpiry": 15
}
```

#### `SDoc__c` (Overrides `styles` category)
```json
{
  "tableRowColor": "#F0F4F8",
  "tableAlternateRowColor": "#E2E8F0",
  "tableBorder": {
    "color": "#CBD5E0",
    "style": "dashed",
    "weight": "2"
  }
}
```

---

### 5.2 Apex Merge & Resolution Pipeline

Below is the implementation extension in `ConfigurationService` to fetch default settings and dynamically merge any record-level overrides based on the record type.

```java
public with sharing class ConfigurationService {

    // ... [Previous retrieval and saving methods] ...

    /**
     * Retrieves settings for a specific runtime context, merging any record-level overrides.
     * @param recordId The ID of the SDTemplate__c, Envelope__c, or SDoc__c record.
     * @return Map<String, Object> Fully resolved and merged settings map.
     */
    public static Map<String, Object> getResolvedSettings(Id recordId) {
        // 1. Fetch default global settings
        Map<String, Object> resolvedSettings = getOverallSettings();
        if (recordId == null) {
            return resolvedSettings;
        }

        // 2. Determine Object Type and Category to override
        Schema.SObjectType sObjectType = recordId.getSObjectType();
        String targetCategory = null;
        String queryStr = null;

        if (sObjectType == Schema.SDTemplate__c.SObjectType) {
            targetCategory = 'templates';
            queryStr = 'SELECT Override_Settings__c FROM SDTemplate__c WHERE Id = :recordId LIMIT 1';
        } else if (sObjectType == Schema.Envelope__c.SObjectType) {
            targetCategory = 'signatureRequest';
            queryStr = 'SELECT Override_Settings__c FROM Envelope__c WHERE Id = :recordId LIMIT 1';
        } else if (sObjectType == Schema.SDoc__c.SObjectType) {
            targetCategory = 'styles';
            queryStr = 'SELECT Override_Settings__c FROM SDoc__c WHERE Id = :recordId LIMIT 1';
        }

        // 3. Query and Merge overrides if found
        if (targetCategory != null && queryStr != null) {
            List<SObject> records = Database.query(queryStr);
            if (!records.isEmpty()) {
                String overrideJson = (String) records[0].get('Override_Settings__c');
                if (String.isNotBlank(overrideJson)) {
                    mergeOverrides(resolvedSettings, targetCategory, overrideJson);
                }
            }
        }

        return resolvedSettings;
    }

    /**
     * Helper method to merge a JSON override block into a target category map.
     */
    private static void mergeOverrides(Map<String, Object> settingsMap, String category, String overrideJson) {
        try {
            Map<String, Object> overrides = (Map<String, Object>) JSON.deserializeUntyped(overrideJson);
            Map<String, Object> categoryMap = (Map<String, Object>) settingsMap.get(category);

            if (categoryMap == null) {
                categoryMap = new Map<String, Object>();
                settingsMap.put(category, categoryMap);
            }

            // Merge values
            for (String key : overrides.keySet()) {
                // Merge override values into the target category map
                categoryMap.put(key, overrides.get(key));
            }
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'Failed to merge overrides for category ' + category + ': ' + ex.getMessage());
        }
    }
}
```

This pattern provides maximum flexibility, allowing specific templates, envelopes, or documents to override only the properties they require, while inheriting all other defaults from the global `Configuration__mdt` store.

