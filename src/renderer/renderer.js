const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const setupForm = document.getElementById('setupForm');
    const deviceTypeSelect = document.getElementById('deviceType');
    const serialNumberInput = document.getElementById('serialNumber');
    const provisionIntuneBtn = document.getElementById('provisionIntune');
    const provisionTACBtn = document.getElementById('provisionTAC');
    const generateCodeBtn = document.getElementById('generateCode');
    const macAddressInput = document.getElementById('macAddress');
    const statusContainer = document.getElementById('status');

    // Device type configurations
    const deviceConfigs = {
        'tap-scheduler': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
        'tap-ip': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true },
        'tap': { requiresIntune: false, requiresTAC: false, requiresCode: true, requiresMac: false },
        'rallybar': { requiresIntune: true, requiresTAC: true, requiresCode: true, requiresMac: true }
    };

    // Handle device type changes
    deviceTypeSelect.addEventListener('change', () => {
        const selectedType = deviceTypeSelect.value;
        const config = deviceConfigs[selectedType] || { requiresIntune: false, requiresTAC: false, requiresCode: false, requiresMac: false };

        provisionIntuneBtn.disabled = !config.requiresIntune;
        provisionTACBtn.disabled = !config.requiresTAC;
        generateCodeBtn.disabled = !config.requiresCode;
        
        // Handle MAC address field
        macAddressInput.disabled = !config.requiresMac;
        if (!config.requiresMac) {
            macAddressInput.value = '';
        }

        // Recheck device status when type changes
        checkDeviceStatus();
    });

    // Check device status in both Intune and TAC
    async function checkDeviceStatus() {
        const serialNumber = serialNumberInput.value.trim();
        const macAddress = macAddressInput.value.trim();
        const deviceType = deviceTypeSelect.value;
        const config = deviceConfigs[deviceType] || {};

        if (serialNumber.length >= 3) {
            try {
                showStatus('Checking device status...', 'info');
                const result = await ipcRenderer.invoke('check-device', {
                    serialNumber,
                    macAddress: config.requiresMac ? macAddress : null,
                    deviceType
                });

                let statusMessage = [];
                
                // Handle Intune status
                if (result.intune.exists) {
                    statusMessage.push(`Intune: ${result.intune.details}`);
                    if (config.requiresIntune) {
                        provisionIntuneBtn.disabled = true;
                    }
                }

                // Handle TAC status
                if (result.tac.exists) {
                    statusMessage.push(`TAC: ${result.tac.details}`);
                    if (config.requiresTAC) {
                        provisionTACBtn.disabled = true;
                    }
                }

                if (statusMessage.length > 0) {
                    showStatus(statusMessage.join('\n'), 'warning');
                } else {
                    showStatus('Device not found in any system', 'success');
                    // Re-enable buttons based on device type requirements
                    provisionIntuneBtn.disabled = !config.requiresIntune;
                    provisionTACBtn.disabled = !config.requiresTAC;
                }
            } catch (error) {
                showStatus(`Error checking device status: ${error.message}`, 'error');
            }
        }
    }

    // Debounced device check
    let deviceCheckTimeout;
    function debouncedDeviceCheck() {
        clearTimeout(deviceCheckTimeout);
        deviceCheckTimeout = setTimeout(checkDeviceStatus, 500);
    }

    // Serial Number input handler
    serialNumberInput.addEventListener('input', debouncedDeviceCheck);

    // MAC Address validation and check
    macAddressInput.addEventListener('input', (e) => {
        if (macAddressInput.disabled) return;
        
        const value = e.target.value;
        // Format MAC address as user types
        const formatted = value
            .replace(/[^0-9a-fA-F]/g, '')
            .toUpperCase()
            .match(/.{1,2}/g)
            ?.join(':')
            .substring(0, 17) || '';
        
        if (value !== formatted) {
            e.target.value = formatted;
        }

        // Check device status if MAC address is complete
        if (formatted.length === 17) {
            debouncedDeviceCheck();
        }
    });

    // Validation function
    function validateForm() {
        const serialNumber = serialNumberInput.value;
        const macAddress = macAddressInput.value;
        const upn = document.getElementById('upn').value;
        const selectedType = deviceTypeSelect.value;
        const config = deviceConfigs[selectedType] || {};
        
        if (!serialNumber.endsWith('2')) {
            showStatus('Serial number must end with 2', 'error');
            return false;
        }

        if (config.requiresMac) {
            const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
            if (!macRegex.test(macAddress)) {
                showStatus('Invalid MAC address format', 'error');
                return false;
            }
        }

        if (!upn.endsWith('@banenor.onmicrosoft.com')) {
            showStatus('Invalid UPN format', 'error');
            return false;
        }

        return true;
    }

    // Handle Intune provisioning
    provisionIntuneBtn.addEventListener('click', async () => {
        if (!validateForm()) return;

        const deviceData = {
            deviceType: deviceTypeSelect.value,
            serialNumber: serialNumberInput.value,
            macAddress: macAddressInput.value,
            upn: document.getElementById('upn').value
        };

        try {
            const result = await ipcRenderer.invoke('provision-intune', deviceData);
            if (result.success) {
                showStatus('Intune provisioning successful!', 'success');
                // Recheck device status after provisioning
                await checkDeviceStatus();
            } else {
                showStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    // Handle TAC provisioning
    provisionTACBtn.addEventListener('click', async () => {
        if (!validateForm()) return;

        const deviceData = {
            deviceType: deviceTypeSelect.value,
            serialNumber: serialNumberInput.value,
            macAddress: macAddressInput.value,
            upn: document.getElementById('upn').value
        };

        try {
            const result = await ipcRenderer.invoke('provision-tac', deviceData);
            if (result.success) {
                showStatus('TAC provisioning successful!', 'success');
                // Recheck device status after provisioning
                await checkDeviceStatus();
            } else {
                showStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    // Handle daily code generation
    generateCodeBtn.addEventListener('click', async () => {
        if (!validateForm()) return;

        try {
            const result = await ipcRenderer.invoke('generate-daily-code');
            showStatus(result.success ? `Daily Code: ${result.code}` : `Error: ${result.error}`, result.success ? 'success' : 'error');
        } catch (error) {
            showStatus(`Error: ${error.message}`, 'error');
        }
    });

    function showStatus(message, type) {
        statusContainer.textContent = message;
        statusContainer.className = `status-container ${type}`;
    }

    // Initialize the form state
    deviceTypeSelect.dispatchEvent(new Event('change'));
}); 