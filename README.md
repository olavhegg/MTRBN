# MTR Resource Account Management

A desktop application built with Electron and TypeScript to manage Microsoft Teams Rooms (MTR) resource accounts and provision devices in Microsoft Intune for Bane NOR.

## Overview

This application helps IT administrators manage Microsoft Teams Rooms resource accounts and provision MTR devices in Microsoft Intune. It provides a user-friendly interface for checking account status, managing license assignments, and provisioning devices without having to navigate multiple Microsoft admin portals.

## Features

- **Account Management**:
  - Check and validate resource account existence
  - Update display names for existing resource accounts
  - Verify account status and group memberships
  
- **Group & License Management**:
  - View available license counts for Teams Room Pro and Teams Shared Devices
  - Manage MTR resource account group membership (`MTR-Resource Accounts`)
  - Add/remove accounts from Teams Room license groups:
    - Teams Shared Devices (`MTR-Teams-Panel-License-Microsoft Teams Shared Devices`)
    - Teams Rooms Pro (`MTR-Teams-Room-License-Teams Rooms Pro`)
  
- **Intune Device Management**:
  - Check if a device exists in Intune using its serial number
  - Provision new devices in Intune for Microsoft Teams Rooms
  - Support for various device types including Android-based MTR devices
  - Validate device serial numbers before provisioning

## Technical Architecture

### Application Structure

The application is built on Electron with a main process and renderer process architecture:

```
MTR/
├── dist/                      # Compiled JavaScript files
├── node_modules/              # Dependencies
├── src/
│   ├── main/                  # Main process code
│   │   ├── handlers/          # IPC handlers for renderer requests
│   │   │   ├── accountHandlers.ts  # Resource account management
│   │   │   ├── groupHandlers.ts    # Group and license management
│   │   │   ├── intuneHandlers.ts   # Device management in Intune
│   │   │   └── index.ts            # Exports all handlers
│   │   ├── services/          # Core business logic
│   │   │   ├── graphBaseService.ts # Base service for Graph API
│   │   │   ├── graphService.ts     # Combined service for all operations
│   │   │   ├── userService.ts      # User account operations
│   │   │   ├── groupService.ts     # Group management operations
│   │   │   └── deviceService.ts    # Device management operations
│   │   ├── utils/             # Utilities
│   │   │   └── logger.ts      # Logging functionality
│   │   └── index.ts           # Main process entry point
│   ├── renderer/              # Renderer process (UI) code
│   │   ├── modules/           # UI modules
│   │   │   ├── accountManagement.ts  # Account UI logic
│   │   │   ├── deviceManagement.ts   # Device UI logic
│   │   │   ├── eventHandlers.ts      # DOM event handlers
│   │   │   ├── groupManagement.ts    # Group/license UI logic
│   │   │   ├── utils.ts              # UI utilities
│   │   │   └── types.ts              # TypeScript interfaces
│   │   ├── index.html         # Main HTML page
│   │   ├── index.ts           # Renderer entry point
│   │   ├── styles.css         # Styling
│   │   └── types.d.ts         # Renderer type definitions
│   └── preload.ts             # Preload script for IPC
├── .env                       # Environment variables
├── logitech.ico               # Application icon
├── Bane_NOR_logo.svg.png      # Bane NOR logo for UI
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Dependency lock file
└── tsconfig.json              # TypeScript configuration
```

### Technology Stack

- **Frontend**: HTML, CSS, TypeScript
- **Backend**: Node.js, Electron
- **API Integration**: Microsoft Graph API
- **Authentication**: Azure AD App Registration with Client Credentials
- **Build Tools**: TypeScript compiler

### Communication Flow

1. **UI Events**: User interactions trigger event handlers in the renderer process
2. **IPC Communication**: Requests are sent from renderer to main process via IPC
3. **API Calls**: Main process services make authenticated calls to Microsoft Graph API
4. **Response Handling**: Results are sent back to the renderer and displayed in the UI

## Workflow Examples

### Account Management Workflow

1. User enters a resource account email (UPN) in the search field
2. Application validates the account existence via Microsoft Graph API
3. If found, account details are displayed including:
   - Display name
   - Account status (locked/unlocked)
   - Group memberships
4. User can update the display name if needed
5. Group memberships can be managed through the UI

### Device Provisioning Workflow

1. User enters a device serial number in the search field
2. Application checks if the device already exists in Intune
3. If not found, user can enter device details (name, model, type)
4. On submission, the application provisions the device in Intune
5. Status updates are displayed to the user

### License Management Workflow

1. Application loads available license information on startup
2. User can view total, used, and available licenses for different license types
3. When checking a resource account, license assignments are displayed
4. User can add or remove license group memberships
5. Changes are immediately reflected in Microsoft 365

## Prerequisites

- Node.js 16+ and npm
- Microsoft Azure AD tenant with appropriate permissions
- App registration in Azure AD with the following permissions:
  - User.ReadWrite.All (for account management)
  - Group.ReadWrite.All (for group membership management)
  - Directory.ReadWrite.All (for tenant-wide operations)
  - DeviceManagementServiceConfig.ReadWrite.All (for Intune operations)
  - DeviceManagementConfiguration.ReadWrite.All (for Intune operations)
  - DeviceManagementManagedDevices.ReadWrite.All (for Intune operations)

## Installation and Setup

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

- **Development Mode**: Run with hot reloading
  ```
  npm run dev
  ```

- **Clean Build**: Remove build artifacts
  ```
  npm run clean
  ```

- **Build for Production**:
  ```
  npm run build
  ```

- **Package for Distribution**: Create executable
  ```
  npx electron-builder --win
  ```

## Security Considerations

- The application uses client credentials flow with a service principal
- All credentials are stored in the .env file (not committed to version control)
- Communication with Microsoft Graph API is secured via HTTPS
- Password management functionality is intentionally removed for security reasons
- The application implements proper error handling for failed API calls

## Limitations

- Cannot create new resource accounts (by design)
- Cannot provision in Teams Admin Center or generate daily codes for devices
- Password management functionality not available (for security reasons) - please use Microsoft Admin Center instead

## Troubleshooting

- **Authentication Issues**: Verify credentials in .env file and ensure app registration has proper permissions
- **API Errors**: Check network connectivity and that proper scopes are granted to the app registration
- **License Issues**: Ensure you have available licenses in your tenant
- **Logging**: Check application logs for detailed error information

## License

ISC