# MTR Resource Account Management

A desktop application built with Electron to manage Microsoft Teams Rooms (MTR) resource accounts and provision devices in Microsoft Intune.

## Features

- **Account Management**:
  - Check and validate resource account existence
  - Update display names for existing resource accounts
  
- **Group & License Management**:
  - View available license counts for Teams Room Pro and Teams Shared Devices
  - Manage MTR resource account group membership (`MTR-Resource Accounts`)
  - Add/remove accounts from Teams Room license groups:
    - Teams Shared Devices (`MTR-Teams-Panel-License-Microsoft Teams Shared Devices`)
    - Teams Rooms Pro (`MTR-Teams-Room-License-Teams Rooms Pro`)
  
- **Account Status**:
  - Check if accounts are unlocked
  - Verify membership in required groups

- **Intune Device Management**:
  - Check if a device exists in Intune using its serial number
  - Provision new devices in Intune for Microsoft Teams Rooms
  - Support for various device types including Android-based MTR devices
  - Validate device serial numbers before provisioning

## Prerequisites

- Node.js 16+
- npm
- Microsoft Azure AD tenant with appropriate permissions
- App registration in Azure AD with the following permissions:
  - User.ReadWrite.All (for account management)
  - Group.ReadWrite.All (for group membership management)
  - Directory.ReadWrite.All (for tenant-wide operations)
  - DeviceManagementServiceConfig.ReadWrite.All (for Intune operations)
  - DeviceManagementConfiguration.ReadWrite.All (for Intune operations)
  - DeviceManagementManagedDevices.ReadWrite.All (for Intune operations)

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mtr-provisioning-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create an `.env` file in the project root with your Azure AD credentials:
   ```
   TENANT_ID=your_tenant_id
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   MTR-ResourceAccountsID=your_mtr_resource_accounts_group_id
   SHARED_GROUP_ID=your_teams_shared_devices_license_group_id
   PRO_GROUP_ID=your_teams_rooms_pro_license_group_id
   ```

4. Build the application:
   ```
   npm run build
   ```

5. Start the application:
   ```
   npm start
   ```

## Development

- Run in development mode with hot reloading:
  ```
  npm run dev
  ```

- Clean build artifacts:
  ```
  npm run clean
  ```

## Usage

1. **Resource Account Management**:
   - Enter a UPN (username@domain) to search for an existing account
   - Update display name for existing accounts
   - View account lock status

2. **License Information**:
   - View total, used, and available licenses for Teams Rooms Pro and Teams Shared Devices
   - Refresh license information with one click

3. **Account Status**:
   - Verify if the account is unlocked
   - Check if the account is a member of the MTR Resource Accounts group

4. **License Management**:
   - Add or remove the account from Teams Shared Devices license group
   - Add or remove the account from Teams Rooms Pro license group

5. **Intune Device Provisioning**:
   - Enter a device serial number to check if it's already registered in Intune
   - Validate the serial number format before provisioning
   - Add new devices to Intune with proper description and configuration
   - Suitable for Microsoft Teams Rooms devices including Android-based systems

## Limitations

- Cannot create new resource accounts
- Cannot provision in Teams Admin Center or generate daily codes for devices
- Password management functionality not available (for security reasons) - please use Microsoft Admin Center instead

## Building for Production

To build the application for production:

```
npm run build
```

For Windows installers, you can use electron-builder:

```
npx electron-builder --win
```

## License

ISC