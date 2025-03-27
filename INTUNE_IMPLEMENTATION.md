# Intune Device Import Implementation

## Overview

This document explains the implementation of device imports to Microsoft Intune used in this application, specifically for Logitech MTR (Microsoft Teams Room) devices.

## Implementation Details

The implementation in `src/main/services/graphService.ts` uses a straightforward approach:

### Device Check Process

1. Retrieve all imported device identities from Intune
2. Filter the devices client-side to find matches by serial number
3. This approach is more reliable than using OData filter queries which can sometimes be inconsistent

### Device Import Process

1. The application uses the Microsoft Graph client to post to the `/deviceManagement/importedDeviceIdentities` endpoint
2. A standard payload is used with the following properties:
   - `importedDeviceIdentifier`: The device serial number
   - `description`: User-provided description
   - `enrollmentState`: 'notContacted'
   - `importedDeviceIdentityType`: 'serialNumber'
   - `platform`: 'unknown'

### Device Validation

The application validates Logitech devices using the following criteria:
- Serial number must be exactly 12 characters long
- Serial number must end with the digit '2'

## Required Permissions

For this implementation to work properly, your Azure AD app registration needs:

- DeviceManagementServiceConfig.ReadWrite.All 
- DeviceManagementConfiguration.ReadWrite.All
- DeviceManagementManagedDevices.ReadWrite.All

## Troubleshooting

If you encounter errors:

1. Check the application logs for detailed error messages
2. Verify that your app has all the necessary permissions listed above
3. Ensure admin consent has been granted for all permissions
4. Check that your .env file contains the correct TENANT_ID, CLIENT_ID, and CLIENT_SECRET 