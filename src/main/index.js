const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { AuthProvider } = require('./auth');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let authProvider;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    
    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    authProvider = new AuthProvider();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Check if device exists in Intune and TAC
ipcMain.handle('check-device', async (event, { serialNumber, macAddress, deviceType }) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        const results = { intune: { exists: false }, tac: { exists: false } };
        
        // Check Intune
        const intuneResult = await graphClient.api('/deviceManagement/managedDevices')
            .filter(`serialNumber eq '${serialNumber}'`)
            .select('id,serialNumber,deviceName,userPrincipalName')
            .get();

        if (intuneResult?.value?.length > 0) {
            const device = intuneResult.value[0];
            results.intune = {
                exists: true,
                details: `Device Name: ${device.deviceName}, User: ${device.userPrincipalName || 'Not assigned'}`
            };
        } else {
            // Check corporate device identifiers
            const corpIdentifiers = await graphClient.api('/deviceManagement/corporateDeviceIdentifiers')
                .filter(`serialNumber eq '${serialNumber}'`)
                .get();

            if (corpIdentifiers?.value?.length > 0) {
                results.intune = {
                    exists: true,
                    details: 'Device exists in corporate identifiers'
                };
            }
        }

        // Check TAC if MAC address is provided
        if (macAddress) {
            const formattedMac = macAddress.replace(/:/g, '-').toUpperCase();
            let tacEndpoint = '/teams/devices';
            
            // Different endpoints based on device type
            if (deviceType === 'tap-scheduler' || deviceType === 'tap-ip') {
                tacEndpoint = '/teams/panels';
            } else if (deviceType === 'rallybar') {
                tacEndpoint = '/teams/androidDevices';
            }

            const tacResult = await graphClient.api(tacEndpoint)
                .filter(`macAddress eq '${formattedMac}'`)
                .get();

            if (tacResult?.value?.length > 0) {
                const device = tacResult.value[0];
                results.tac = {
                    exists: true,
                    details: `Device Name: ${device.displayName || device.deviceName || 'Unknown'}`
                };
            }
        }

        return results;
    } catch (error) {
        console.error('Error checking device:', error);
        throw error;
    }
});

// IPC Handlers
ipcMain.handle('provision-intune', async (event, deviceData) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        
        // First, add to corporate device identifiers
        await graphClient.api('/deviceManagement/corporateDeviceIdentifiers').post({
            serialNumber: deviceData.serialNumber,
            ...(deviceData.macAddress && { wifiMacAddress: deviceData.macAddress.replace(/:/g, '-') })
        });

        // TODO: Additional Intune provisioning steps as needed
        return { success: true };
    } catch (error) {
        console.error('Error provisioning device in Intune:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('provision-tac', async (event, deviceData) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        
        const formattedMac = deviceData.macAddress.replace(/:/g, '-').toUpperCase();
        let endpoint = '/teams/devices';
        let payload = {
            macAddress: formattedMac,
            serialNumber: deviceData.serialNumber
        };

        // Different endpoints and payloads based on device type
        if (deviceData.deviceType === 'tap-scheduler' || deviceData.deviceType === 'tap-ip') {
            endpoint = '/teams/panels';
            payload = {
                ...payload,
                deviceType: 'teams panel',
                displayName: `Teams Panel - ${deviceData.serialNumber}`
            };
        } else if (deviceData.deviceType === 'rallybar') {
            endpoint = '/teams/androidDevices';
            payload = {
                ...payload,
                deviceType: 'teams room',
                displayName: `Teams Room - ${deviceData.serialNumber}`
            };
        }

        await graphClient.api(endpoint).post(payload);
        return { success: true };
    } catch (error) {
        console.error('Error provisioning device in TAC:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-daily-code', async (event) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        
        // TODO: Implement daily code generation logic
        // Example:
        // const response = await graphClient.api('/teams/devices/generateCode').post({});
        // return { success: true, code: response.code };

        return { success: true, code: 'SAMPLE-CODE' };
    } catch (error) {
        console.error('Error generating daily code:', error);
        return { success: false, error: error.message };
    }
});

// Handler for checking UPN in Azure AD
ipcMain.handle('check-resource-account', async (event, upn) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        
        // Search for the user in Azure AD
        const result = await graphClient.api('/users')
            .filter(`userPrincipalName eq '${upn}'`)
            .select('id,displayName,userPrincipalName')
            .get();

        return {
            exists: result.value.length > 0,
            details: result.value[0] || null
        };
    } catch (error) {
        console.error('Error checking resource account:', error);
        throw error;
    }
});

// Handler for checking serial number in Intune
ipcMain.handle('check-serial-number', async (event, serialNumber) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        
        // Search for the device in Intune corporate identifiers
        const result = await graphClient.api('/deviceManagement/corporateIdentifiers')
            .filter(`serialNumber eq '${serialNumber}'`)
            .get();

        return {
            exists: result.value.length > 0,
            details: result.value[0] || null
        };
    } catch (error) {
        console.error('Error checking serial number:', error);
        throw error;
    }
});

// Handler for checking MAC address in TAC
ipcMain.handle('check-mac-address', async (event, { macAddress, deviceType }) => {
    try {
        const graphClient = await authProvider.getGraphClient();
        const formattedMac = macAddress.replace(/:/g, '-').toUpperCase();
        
        // Different endpoints based on device type
        let endpoint = '/teams/devices';
        if (deviceType === 'tap-scheduler' || deviceType === 'tap-ip') {
            endpoint = '/teams/panels';
        } else if (deviceType === 'rallybar') {
            endpoint = '/teams/androidDevices';
        }

        const result = await graphClient.api(endpoint)
            .filter(`macAddress eq '${formattedMac}'`)
            .get();

        return {
            exists: result.value.length > 0,
            details: result.value[0] || null
        };
    } catch (error) {
        console.error('Error checking MAC address:', error);
        throw error;
    }
}); 