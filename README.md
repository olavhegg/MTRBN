# Microsoft Graph API - Intune Device Management

This repository contains tools for testing and managing devices in Microsoft Intune through the Microsoft Graph API.

## Key Findings

After extensive testing, we discovered that:

1. The most reliable way to add devices to Intune is through the Windows Autopilot API
2. The endpoint `/deviceManagement/importedWindowsAutopilotDeviceIdentities` works for importing device identities
3. This requires using the beta Graph API (`https://graph.microsoft.com/beta/...`)
4. Using direct HTTP calls with axios provides more consistent results than the Graph Client library for this specific endpoint

## Required Permissions

For these tools to work properly, your app registration needs:

- DeviceManagementServiceConfig.ReadWrite.All 
- DeviceManagementConfiguration.ReadWrite.All
- DeviceManagementManagedDevices.ReadWrite.All
- Group.ReadWrite.All (for creating groups)

## Tools Available

### 1. Import a Device

Adds a new device to Intune using the Windows Autopilot API:

```
node src/import-device.js <serialNumber> <groupTag>
```

Example:
```
node src/import-device.js 555-ABCDE-12345 MTR-Room
```

### 2. List All Devices

Shows all imported Windows Autopilot device identities:

```
node src/list-devices.js
```

### 3. Test Connection and API Status

Tests connection to various Microsoft Graph API endpoints to verify permissions:

```
node src/test-connection.js
```

### 4. Test Intune-Specific Endpoints

Tests various Intune-specific endpoints to check permissions and functionality:

```
node src/test-intune-endpoints.js
```

### 5. Test Managed Devices

Tests managed device endpoints specifically:

```
node src/test-managed-devices.js
```

### 6. Test Device Enrollment

Tests the device enrollment profiles and categories:

```
node src/test-device-enrollment.js
```

## Troubleshooting

If you encounter errors:

1. Check that your app has all the necessary permissions listed above
2. Verify that admin consent has been granted for all permissions
3. Ensure your .env file contains the correct TENANT_ID, CLIENT_ID, and CLIENT_SECRET
4. Remember that some operations might take time to propagate through the Microsoft Graph API 